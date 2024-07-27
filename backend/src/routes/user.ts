import express from "express"
import z from "zod"
import { client } from "../db";
import jwt from "jsonwebtoken"
import { JWT_USER } from "../config";
import { authMiddleWare } from "../middleware";
export const userRouter = express.Router();

const signUpBody = z.object({
    username: z.string(),
    email: z.string().email(),
    password: z.string()
})

userRouter.post("/signup", async(req, res) => {
    const parsedBody = signUpBody.safeParse(req.body);

    if(!parsedBody.success) {
       return  res.status(403).json({message: "Wrong inputs"})
    }
   try {
    await client.$transaction(async tx => {
        const user = await tx.user.create({
            data: {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password
            }
        })
        await tx.userAccount.create({
            data: {
                userId: user.id
            }
        })
    })
        res.status(200).json({message: "Signed up"})
    } catch(err) {
        return res.status(411).json({error: err})
    }
})

const signInBody = z.object({
    username: z.string(),
    password: z.string(),
})

userRouter.post('signin', async(req, res) => {
    const parsedBody = signInBody.safeParse(req.body)

    if(!parsedBody.success) {
        res.status(403).json({message: "Wrong inputs"})
    }

    const existingUser = await client.user.findFirst({
        where: {
            username: req.body.username
        }
    })
    if(!existingUser) {
      return res.status(411).json({message: "User does not exist"})
    }

    const token = jwt.sign({
        id: existingUser.id,
    }, JWT_USER)

    res.status(200).json({token: token})
})

userRouter.post("/onramp", authMiddleWare, async(req, res) => {
    const {userId, amount} = req.body;

    await client.userAccount.update({
        where: {
            id: userId
        }, 
        data: {
            balance: {
                increment: amount
            }
        }
    })
    return res.status(200).json({message: "On ramp done"});
})

userRouter.post("/transfer", authMiddleWare, async (req, res) => {
    const {merchantId, amount} = req.body;
    // @ts-ignore
    const userId = req.id
    const payment = await client.$transaction(async tx => {
        await tx.$queryRaw`SELECT * FROM "UserAccount" WHERE "userId" = ${userId} FOR UPDATE`; // for locking the amount during transaction 
            const userAccount = await client.userAccount.findFirst({
                where: {
                    userId
                }
            })

            if(userAccount?.balance || 0 < amount) {
               return false;
            }

            await tx.userAccount.update({
                where: {
                    userId
                },
                data: {
                    balance: {
                        decrement: amount
                    }
                }
            })

            await tx.merchantAccount.update({
                where: {
                    merchantId
                },
                data: {
                    balance: {
                        increment: amount
                    }
                }
            })     
            return true;
    }, {
        maxWait: 2000,
        timeout: 5000
    })
    if(payment) {
       return res.status(200).json({message: "payment done"})
    }
    else {
        return res.status(403).json({
            message: "Payment failed"
        })
    }
})