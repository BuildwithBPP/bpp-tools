import rawSnapshot from "./delivery-command.json";
import { deliveryCommandSchema } from "../domain/delivery/schema";

export const deliveryCommand = deliveryCommandSchema.parse(rawSnapshot);
