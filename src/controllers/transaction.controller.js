const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        })
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "fromAccount and toAccount cannot be the same"
        })
    }

    let transaction
    const session = await mongoose.startSession()

    try {
        await session.withTransaction(async () => {
            /**
             * 2 & 3. Read accounts and check status (inside the transaction)
             */
            const fromUserAccount = await accountModel.findById(fromAccount).session(session)
            const toUserAccount = await accountModel.findById(toAccount).session(session)

            if (!fromUserAccount || !toUserAccount) {
                throw { status: 400, message: "Invalid fromAccount or toAccount" }
            }

            if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
                throw { status: 400, message: "Both fromAccount and toAccount must be ACTIVE to process transaction" }
            }

            /**
             * 2. Validate idempotency key (inside the transaction)
             */
            const existing = await transactionModel.findOne({ idempotencyKey }).session(session)

            if (existing) {
                if (existing.status === "COMPLETED") {
                    throw { status: 200, message: "Transaction already processed", transaction: existing }
                }
                if (existing.status === "PENDING") {
                    throw { status: 200, message: "Transaction is still processing" }
                }
                throw { status: 409, message: `Transaction is in ${existing.status} state, please retry with a new idempotency key` }
            }

            /**
             * 4. Derive sender balance from ledger (inside the transaction)
             */
            const balance = await fromUserAccount.getBalance({ session })

            if (balance < amount) {
                throw { status: 400, message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}` }
            }

            /**
             * 5. Create transaction (PENDING)
             */
            transaction = (await transactionModel.create([ {
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            } ], { session }))[ 0 ]

            /**
             * 6. Create DEBIT ledger entry
             */
            await ledgerModel.create([ {
                account: fromAccount,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            } ], { session })

            /**
             * 7. Create CREDIT ledger entry
             */
            await ledgerModel.create([ {
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            } ], { session })

            /**
             * 8. Mark transaction COMPLETED
             */
            await transactionModel.updateOne(
                { _id: transaction._id },
                { status: "COMPLETED" },
                { session }
            )
            transaction.status = "COMPLETED"
        })
    } catch (error) {
        if (error && error.status) {
            return res.status(error.status).json({
                message: error.message,
                ...(error.transaction ? { transaction: error.transaction } : {})
            })
        }
        return res.status(500).json({
            message: "Transaction failed, please retry after sometime"
        })
    } finally {
        session.endSession()
    }

    /**
     * 10. Send email notification (must not fail the request)
     */
    try {
        await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
    } catch (error) {
        console.error("Failed to send transaction email:", error)
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        })
    }

    let transaction
    const session = await mongoose.startSession()

    try {
        await session.withTransaction(async () => {
            const toUserAccount = await accountModel.findById(toAccount).session(session)

            if (!toUserAccount) {
                throw { status: 400, message: "Invalid toAccount" }
            }

            const fromUserAccount = await accountModel.findOne({ user: req.user._id }).session(session)

            if (!fromUserAccount) {
                throw { status: 400, message: "System user account not found" }
            }

            const existing = await transactionModel.findOne({ idempotencyKey }).session(session)

            if (existing) {
                throw { status: 200, message: "Transaction already processed", transaction: existing }
            }

            transaction = (await transactionModel.create([ {
                fromAccount: fromUserAccount._id,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            } ], { session }))[ 0 ]

            await ledgerModel.create([ {
                account: fromUserAccount._id,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            } ], { session })

            await ledgerModel.create([ {
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            } ], { session })

            await transactionModel.updateOne(
                { _id: transaction._id },
                { status: "COMPLETED" },
                { session }
            )
            transaction.status = "COMPLETED"
        })
    } catch (error) {
        if (error && error.status) {
            return res.status(error.status).json({
                message: error.message,
                ...(error.transaction ? { transaction: error.transaction } : {})
            })
        }
        return res.status(500).json({
            message: "Initial funds transaction failed, please retry"
        })
    } finally {
        session.endSession()
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}
