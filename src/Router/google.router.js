import { Router } from "express";
import { googleRedirect,googleCallBack } from "../Controller/google.controller.js";


export const googleRouter = Router();

googleRouter.get("/",googleRedirect);
googleRouter.get("/callback",googleCallBack);