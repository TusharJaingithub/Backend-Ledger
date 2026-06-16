const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

/**
 * Validate ObjectId
 */
function validateObjectId(id, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, `Invalid ${fieldName}`);
  }
}

/**
 * Create Ledger Entry Helper
 */
async function createLedgerEntry(account, amount, transaction, type, session) {
  return ledgerModel.create(
    [
      {
        account,
        amount,
        transaction,
        type,
      },
    ],
    { session }
  );
}

/**
 * Create a new transaction
 */
async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body ?? {};
  const transferAmount = Number(amount);

  try {
    /**
     * 1. Validate Request
     */
    if (
      !fromAccount ||
      !toAccount ||
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !idempotencyKey
    ) {
      throw new AppError(
        400,
        "fromAccount, toAccount, amount and idempotencyKey are required"
      );
    }

    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
      throw new AppError(400, "Amount must be a positive number");
    }

    if (fromAccount === toAccount) {
      throw new AppError(
        400,
        "fromAccount and toAccount cannot be the same"
      );
    }

    validateObjectId(fromAccount, "fromAccount");
    validateObjectId(toAccount, "toAccount");

    let transaction;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        /**
         * 2. Read accounts
         */
        const fromUserAccount = await accountModel
          .findById(fromAccount)
          .session(session);

        const toUserAccount = await accountModel
          .findById(toAccount)
          .session(session);

        if (!fromUserAccount || !toUserAccount) {
          throw new AppError(400, "Invalid fromAccount or toAccount");
        }

        /**
         * 3. Check status
         */
        if (
          fromUserAccount.status !== "ACTIVE" ||
          toUserAccount.status !== "ACTIVE"
        ) {
          throw new AppError(
            400,
            "Both accounts must be ACTIVE to process transaction"
          );
        }

        /**
         * 4. Ownership check
         */
        if (fromUserAccount.user.toString() !== req.user._id.toString()) {
          throw new AppError(
            403,
            "You can only transfer from your own account"
          );
        }

        /**
         * 5. Idempotency check
         */
        const existing = await transactionModel
          .findOne({ idempotencyKey })
          .session(session);

        if (existing) {
          if (existing.status === "COMPLETED") {
            throw new AppError(200, "Transaction already processed", {
              transaction: existing,
            });
          }

          if (existing.status === "PENDING") {
            throw new AppError(202, "Transaction is still processing");
          }

          throw new AppError(
            409,
            `Transaction is in ${existing.status} state. Retry with a new idempotency key`
          );
        }

        /**
         * 6. Check balance
         */
        const balance = await fromUserAccount.getBalance({ session });

        if (balance < transferAmount) {
          throw new AppError(
            400,
            `Insufficient balance. Current balance: ${balance}`
          );
        }

        /**
         * 7. Create transaction
         */
        transaction = (
          await transactionModel.create(
            [
              {
                fromAccount,
                toAccount,
                amount: transferAmount,
                idempotencyKey,
                status: "PENDING",
              },
            ],
            { session }
          )
        )[0];

        /**
         * 8. Ledger entries
         */
        await createLedgerEntry(
          fromAccount,
          transferAmount,
          transaction._id,
          "DEBIT",
          session
        );

        await createLedgerEntry(
          toAccount,
          transferAmount,
          transaction._id,
          "CREDIT",
          session
        );

        /**
         * 9. Complete transaction
         */
        await transactionModel.updateOne(
          { _id: transaction._id },
          { status: "COMPLETED" },
          { session }
        );

        transaction.status = "COMPLETED";
      });
    } finally {
      await session.endSession();
    }

    /**
     * 10. Send success email (outside transaction)
     */
    try {
      await emailService.sendTransactionEmail(
        req.user.email,
        req.user.name,
        transferAmount,
        toAccount
      );
    } catch (emailError) {
      console.error("Failed to send success email:", emailError);
    }

    return res.status(201).json({
      message: "Transaction completed successfully",
      transaction,
    });
  } catch (error) {
    /**
     * Send failure email only for real business failures
     */
    if (error.status && error.status >= 400) {
      try {
        await emailService.sendTransactionFailureEmail(
          req.user.email,
          req.user.name,
          transferAmount,
          toAccount
        );
      } catch (emailError) {
        console.error("Failed to send failure email:", emailError);
      }
    }

    return res.status(error.status || 500).json({
      message: error.message || "Transaction failed, please retry later",
      ...(error.transaction ? { transaction: error.transaction } : {}),
    });
  }
}

/**
 * Initial Funds Transaction (System Funding)
 */
async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body ?? {};
  const transferAmount = Number(amount);

  try {
    if (
      !toAccount ||
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !idempotencyKey
    ) {
      throw new AppError(
        400,
        "toAccount, amount and idempotencyKey are required"
      );
    }

    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
      throw new AppError(400, "Amount must be a positive number");
    }

    validateObjectId(toAccount, "toAccount");

    let transaction;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const toUserAccount = await accountModel
          .findById(toAccount)
          .session(session);

        if (!toUserAccount) {
          throw new AppError(400, "Invalid toAccount");
        }

        /**
         * Dedicated system account
         */
        const systemAccount = await accountModel
          .findOne({ type: "SYSTEM" })
          .session(session);

        if (!systemAccount) {
          throw new AppError(400, "System account not found");
        }

        const existing = await transactionModel
          .findOne({ idempotencyKey })
          .session(session);

        if (existing) {
          throw new AppError(200, "Transaction already processed", {
            transaction: existing,
          });
        }

        transaction = (
          await transactionModel.create(
            [
              {
                fromAccount: systemAccount._id,
                toAccount,
                amount: transferAmount,
                idempotencyKey,
                status: "PENDING",
              },
            ],
            { session }
          )
        )[0];

        await createLedgerEntry(
          systemAccount._id,
          transferAmount,
          transaction._id,
          "DEBIT",
          session
        );

        await createLedgerEntry(
          toAccount,
          transferAmount,
          transaction._id,
          "CREDIT",
          session
        );

        await transactionModel.updateOne(
          { _id: transaction._id },
          { status: "COMPLETED" },
          { session }
        );

        transaction.status = "COMPLETED";
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      message: "Initial funds transaction completed successfully",
      transaction,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message:
        error.message || "Initial funds transaction failed, please retry",
      ...(error.transaction ? { transaction: error.transaction } : {}),
    });
  }
}

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
};