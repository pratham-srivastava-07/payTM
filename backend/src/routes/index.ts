import express from "express"
import { userRouter } from "./user";
import { merchantRouter } from "./merchant";

export const router = express.Router()

router.use("/user", userRouter);

router.use("/merchant", merchantRouter);