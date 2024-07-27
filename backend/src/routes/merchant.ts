import express from "express"
import z from "zod"
import { client } from "../db"
import jwt from "jsonwebtoken"
import { JWT_MERCHANT } from "../config"
export const merchantRouter = express.Router()

const signUpBody = z.object({
    username: z.string(),
    email: z.string().email(),
    password: z.string()
})


merchantRouter.post("/signup", async(req, res) => {
    const parsedBody = signUpBody.safeParse(req.body)

    if(!parsedBody.success) {
      return res.status(403).json({message: "Wrong inputs"})
    }

       try {
            await client.$transaction(async tx => {
                const merchant = await tx.merchant.create({
                    data: {
                        username: req.body.username,
                        email: req.body.email,
                        password: req.body.password
                    }  
                })
                await tx.merchantAccount.create({
                    data: {
                        merchantId: merchant.id
                    }
                })
            })
    res.status(200).json({message: "signed up"});
       } catch(e) {
        return res.status(411).json({error: e});
       }
})

const signInBody = z.object({
    username: z.string(),
    password: z.string(),
})

merchantRouter.post("/signin", async(req, res) => {
    const parsedBody = signInBody.safeParse(req.body)

    if(!parsedBody.success) {
      return res.status(403).json({message: "Wrong inputs"});
    }
    const merchant = await client.merchant.findFirst({
        where: {
            username: req.body.username,
            password: req.body.password
        }
    })

    if(!merchant) {
       return res.status(403).json({message: "User does not exist"});
    }
    const token = jwt.sign({
        id: merchant.id
    }, JWT_MERCHANT)

    res.status(200).json({token: token});
    
})