import Customers from "../../Models/customers.js";
import Orders from "../../Models/orders.js";
import RestaurantModel from "../../Models/restaurants.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import config from "../../utils/config.js";
import { sendMessageTwilio } from "../../utils/twilio.js";
import { sendEmail } from "../../utils/sendgrid.js";
import { stripeInstance } from "../../utils/stripe.js";

const resolvers = {
  Query: {
    async getCustomerProfile(parent, { id }) {
      try {
        const customer_id = id;
        const c = await Customers.findById(customer_id);
        return c;
        // return res.status(200).json(c);
      } catch (error) {
        console.log(error);
        throw new Error(error);
        // return res.status(500).json(error);
      }
    },
    async getCustomerOrders(_, { id, page = 1, pageSize = 5 }) {
      try {
        const customer_id = id;
        let orders = await Orders.find({ customer_id }).populate("rateId");
        let pageMax = Math.ceil(orders.length / pageSize);
        if (page > pageMax) {
          page = pageMax;
        }
        let start = (page - 1) * pageSize;
        let end = page * pageSize;
        orders = orders.slice(start, end);
        return { data: orders, page, pageSize };
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },
  },
  Mutation: {
    async updateCustomerProfile(parent, { customerInput }) {
      try {
        const {
          customer_id,
          email,
          first_name,
          last_name,
          phone_number,
          dob,
          nickname,
          profile_pic,
          about,
          street_address,
          apt_number,
          city,
          state,
          country,
          zipcode,
        } = customerInput;
        const update = {
          email,
          first_name,
          last_name,
          phone_number,
          dob,
          nickname,
          profile_pic,
          about,
          address: {
            street_address,
            apt_number,
            city,
            state,
            country,
            zipcode,
          },
        };
        const result = await Customers.findByIdAndUpdate(customer_id, update, {
          new: true,
        });
        return result;
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },
    async placeOrder(_, { placeOrderInput }) {
      try {
        const {
          customer_id,
          first_name,
          last_name,
          cart,
          delivery_type,
          delivery_address,
          order_date_time,
          total_amount,
          delivery_fee,
          taxes,
          instruction,
          tip,
          paymentIntentId,
          orderOption,
        } = placeOrderInput;
        // For single Rest order place:
        let cartList = cart?.length > 0 && cart[0];
        let order_items = [];
        cartList?.dishes.map((dish) => {
          order_items.push({
            res_id: dish.res_id,
            res_menu_id: dish.res_menu_id,
            dish_name: dish.dish_name,
            description: dish.description,
            quantity: dish.quantity,
            dish_price: dish.dish_price,
            dish_category: dish.dish_category,
            food_type: dish.food_type,
          });
        });

        let orderPayload = {
          res_id: cartList._id,
          res_name: cartList.name,
          customer_id,
          first_name,
          last_name,
          order_date_time,
          delivery_type,
          delivery_address,
          delivery_fee,
          taxes,
          tip,
          instruction,
          total_amount,
          order_items,
          paymentIntentId,
          orderOption,
        };

        const restaurant = await RestaurantModel.findById(orderPayload.res_id);
        const customer = await Customers.findById(orderPayload.customer_id);
        if (!restaurant || !customer) {
          throw new Error("restaurant / customer not found");
        }

        const mailData = {
          email: restaurant.email,
          subject: "New Order received.",
          html: `<html>
              <body>
                <p>New Order Received!</p>
                ${order_items
                  .map(
                    (item) =>
                      ` <p>
                      ${item.quantity} x ${item.dish_name}
                    </p>`
                  )
                  .join("")}
                <p>Total Amount: ${total_amount}</p>
              </body>
            </html>`,
        };

        const twilioMessage = `New Order Received! \n ${order_items
          .map((item) => {
            return `${item.quantity} x ${item.dish_name} \n`;
          })
          .join("")} \nTotal Amount: ${total_amount}`;

        if (restaurant.notificationMode === "TEXT") {
          await sendMessageTwilio({
            to: restaurant.phone_number,
            amount: total_amount,
            twilioMessage,
          }).catch(async (error) => {
            console.log(error);
          });
        } else if (restaurant.notificationMode === "EMAIL") {
          await sendEmail(mailData).catch(async (error) => {
            console.log(error);
          });
        } else if (restaurant.notificationMode === "BOTH") {
          await sendMessageTwilio({
            to: restaurant.phone_number,
            amount: total_amount,
            twilioMessage,
          }).catch(async (error) => {
            console.log(error);
          });

          await sendEmail(mailData).catch(async (error) => {
            console.log(error);
          });
        }
        const order = new Orders({ ...orderPayload });
        const savedOrder = await order.save();
        function delay(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        await delay(2000);
        const paymentIntent = await stripeInstance().paymentIntents.retrieve(
          paymentIntentId
        );
        // console.log({ paymentIntent });
        console.log("paymentIntent stage clear");

        const totalDescription = JSON.parse(paymentIntent.description);
        const {
          description: { subTotalAmount },
        } = totalDescription;

        const commissionAmount = subTotalAmount * 0.1; // 10% commission

        const chargeId = paymentIntent.latest_charge;
        const charge = await stripeInstance().charges.retrieve(chargeId);
        // console.log({ charge });
        console.log("charge stage clear");

        const balance_transaction =
          await stripeInstance().balanceTransactions.retrieve(
            charge.balance_transaction
          );
        // console.log({ balance_transaction });
        console.log("balance_transaction stage clear");

        const charges = balance_transaction.fee / 100;
        const cutAmount = commissionAmount + charges;

        const finalRefundAmount = Math.floor(
          paymentIntent.amount - cutAmount * 100
        );

        const connectedAccountId = restaurant.stripeAccountId;

        const transfer = await stripeInstance().transfers.create({
          amount: finalRefundAmount,
          currency: "cad",
          destination: connectedAccountId,
          transfer_group: savedOrder._id.toString(),
        });
        const updatedOrders = await Orders.findByIdAndUpdate(
          savedOrder._id.toString(),
          {
            transferId: transfer.id,
            paymentDetails: {
              tip,
              subTotalAmount,
              commissionAmount,
              charges,
              cutAmount,
              transfer: transfer.amount / 100,
              totalAmount: paymentIntent.amount / 100,
              taxes,
            },
          }
        );
        return updatedOrders;
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    },
    async customerLogin(_, { loginInput }) {
      try {
        const { email, password } = loginInput;
        const customer = await Customers.findOne({ email });
        if (!customer.have_access) {
          throw new Error("Access denied");
        }
        if (!customer) {
          throw new Error("Invalid email");
          // callback(null, {status_code: 400, response: {msg: "Invalid email"}});
          // return;
        }

        const match = await bcrypt.compare(password, customer.password);
        if (!match) {
          throw new Error("Invalid password");
          // res.status(400).json({msg: "Invalid password"});
          // callback(null, {status_code: 400, response: {msg: "Invalid password"}});
          // return;
        }
        // console.log("==========about to go");
        const token = jwt.sign({ email }, config.token_key, {
          expiresIn: "2h",
        });
        customer.token = "Bearer " + token;
        await customer.save();
        return customer;
        // res.status(200).json(customer);
        // callback(null, {status_code: 200, response: customer});
        // return;
      } catch (error) {
        console.log("======inside catch:");
        console.log("error==", error);
        throw new Error(error);
        // return res.status(500).json({msg: error});
        // callback(null, {status_code: 500, response: {msg: error}});
        // return;
      }
    },
    async customerLogout(_, { logoutInput }) {
      const { email } = logoutInput;
      try {
        await Customers.updateOne({ email }, { token: "" });
        return;
      } catch (error) {
        console.log("error==", error);
        throw new Error(error);
      }
    },
    async customerSignup(_, { customerSignupInput }) {
      try {
        const {
          email,
          password,
          first_name,
          last_name,
          city = "",
          street_address = "",
          apt_number = "",
          state = "",
          country = "",
          zipcode,
        } = customerSignupInput;
        const existingUser = await Customers.findOne({ email: email });
        if (existingUser) {
          throw new Error("Customer with given email already exist");
        }
        console.log("========1");
        let c;
        await bcrypt.hash(password, 10, async function (err, hash) {
          const customerBody = new Customers({
            first_name,
            last_name,
            email,
            password: hash,
            phone_number: "",
            dob: "",
            nickname: "",
            profile_pic: "",
            about: "",
            address: {
              street_address,
              apt_number,
              city,
              state,
              country,
              zipcode,
            },
          });
          console.log("========2");
          await customerBody.save();
          console.log("========3", customerBody);
          return;
          // c = customerBody;
        });
        // return c
      } catch (error) {
        console.log("error==", error);
        throw new Error(error);
      }
    },
  },
};

export default resolvers;
