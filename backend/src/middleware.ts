import { NextFunction, Request, Response } from "express";

import jwt, { JwtPayload } from "jsonwebtoken"
import { JWT_MERCHANT, JWT_USER } from "./config";

export async function authMiddleWare(req: Request, res: Response, next: NextFunction) {
    const authHeaders = req.headers.authorization;

    if(!authHeaders || authHeaders.startsWith("Bearer")) {
        return res.status(411).json("Wrong authHeaders")
    }

    const token = authHeaders.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_USER)  as JwtPayload;
        // @ts-ignore
        req.id = decoded.id
        next();
    } catch(err) {
        res.status(403).json(err);
    }
}


export const merchantAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["authorization"] as unknown as string;
    
    const verified = jwt.verify(token, JWT_MERCHANT);

    if (verified) { 
        // @ts-ignore
        req.id = verified.id;
        next();
    } else {
        return res.status(403).json({
            message: "Not authorized"
        })
    }
}