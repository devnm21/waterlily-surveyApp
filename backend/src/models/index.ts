import { db } from "../db/index.js";
import { UserModel } from "./user.js";

export const models = {
  users: new UserModel(db),
};
