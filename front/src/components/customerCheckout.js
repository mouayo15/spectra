/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-key */
/* eslint-disable react/jsx-filename-extension */
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import moment from "moment";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  useMutation,
  useLazyQuery,
  gql,
} from "@apollo/client";
import axios from "axios";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import {
  Typography,
  Box,
  Grid,
  Hidden,
  Card,
  CardActions,
  CardActionArea,
  CardContent,
  List,
  ListItem,
  Input,
} from "@material-ui/core";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import { orange, teal } from "@material-ui/core/colors";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Navigationbar from "./navigationbar";
import { clearCart, updateCustomerProfile } from "../app/reducers/mainSlice";
import { capsStrFirstChar } from "../utility";
import ResDishCard from "./ResDishCard";
import CartDialog from "./CartDialog";
import { PLACE_ORDER } from "../graphql/mutation";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "./PaymentForm";

const stripePromise = loadStripe(
  "pk_test_51PD8wPGEpr3f403gfUpeHIf1hqpuU85b9lTXiPbFtRiWgE1DrlIWJXXmX47HTfKOvAqo2vgTwFTH2LUv6n6WY7KS00qeft1Nhu"
);

const useStyles = makeStyles({
  input: {
    "& input[type=number]": {
      "-moz-appearance": "textfield",
    },
    "& input[type=number]::-webkit-outer-spin-button": {
      "-webkit-appearance": "none",
      margin: 0,
    },
    "& input[type=number]::-webkit-inner-spin-button": {
      "-webkit-appearance": "none",
      margin: 0,
    },
  },
});

export default function CustomerCheckout() {
  const mainReducer = useSelector((state) => state.mainReducer);
  const { customerProfile, token, cart = [] } = mainReducer;
  const [deliveryAddressList, setDeliveryAddressList] = useState(
    customerProfile.delivery_addresses || []
  );
  const [selectedAddress, setSelectedAddress] = useState("");
  const [orderOption, setOrderOption] = useState("");

  const handleOptionChange = (e) => {
    setOrderOption(e.target.value);
  };
  const [tip, setTip] = useState(0);
  const [newAddess, setNewAddess] = useState();
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  useEffect(() => {}, [dispatch]);
  useEffect(() => {
    getDeliveryAddressesApi();
  }, []);
  const history = useHistory();
  const classes = useStyles();

  const handleClickOpen = () => {
    if (orderOption === "") {
      alert("Select an order option");
      return;
    }

    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const getDeliveryAddressesApi = async () => {
    try {
      setDeliveryAddressList(customerProfile.delivery_addresses);
    } catch (err) {
      console.log(err);
    }
  };

  const addDeliveryAddressesApi = async (delivery_address) => {
    const url = `/customers/delivery_address`;
    const body = {
      customer_id,
      delivery_address,
    };
    const headers = {
      Authorization: token,
    };
    try {
      const res = await axios.post(url, body, { headers });
      console.log("response", res);
      dispatch(updateCustomerProfile(res.data?.data));
      setDeliveryAddressList(res.data?.data?.delivery_addresses);
      setNewAddess("");
    } catch (err) {
      console.log(err);
    }
  };

  let subTotalAmount = 0;
  for (let resIndex = 0; resIndex < cart.length; resIndex++) {
    for (
      let dishIndex = 0;
      dishIndex < cart[resIndex].dishes?.length;
      dishIndex++
    ) {
      subTotalAmount +=
        cart[resIndex].dishes[dishIndex].dish_price *
        cart[resIndex].dishes[dishIndex].quantity;
    }
  }
  const deliveryFee = 0.0;
  const taxes = parseFloat(((subTotalAmount * 14.975) / 100).toFixed(2));
  // const taxes = (subTotalAmount * 14.975) / 100;
  const defaultTotalAmount = deliveryFee * cart.length + taxes + subTotalAmount;
  const [totalAmount, setTotalAmount] = useState(defaultTotalAmount);

  const isPickupOnlyRes = cart.length > 0 && cart[0]?.delivery_option === 3;

  const onChangeTip = (tipValue) => {
    if (tipValue) {
      setTip(tipValue);
      const totalAmountAfterTip = (defaultTotalAmount * tipValue) / 100;
      setTotalAmount(defaultTotalAmount + totalAmountAfterTip);
    } else {
      setTip(0);
      setTotalAmount(defaultTotalAmount);
    }
  };

  const [savedAmount, setSavedAmount] = useState(0);
  useEffect(() => {
    let subTotalAmountTmp = 0;
    for (let resIndex = 0; resIndex < cart.length; resIndex++) {
      for (
        let dishIndex = 0;
        dishIndex < cart[resIndex].dishes?.length;
        dishIndex++
      ) {
        subTotalAmountTmp +=
          cart[resIndex].dishes[dishIndex].original_dish_price *
          cart[resIndex].dishes[dishIndex].quantity;
      }
    }

    const tipAmount = tip
      ? parseFloat(((subTotalAmountTmp * tip) / 100).toFixed(2))
      : 0;

    const totalAmountAfterTip = subTotalAmountTmp + tipAmount;

    const taxes = parseFloat(((totalAmountAfterTip * 14.975) / 100).toFixed(2));

    const finalAmount = totalAmountAfterTip + taxes;

    setSavedAmount((finalAmount - totalAmount).toFixed(2));
  }, [tip, cart, totalAmount]);

  const resAddress = cart.length > 0 && cart[0].address;
  const pickupAddress = Object.values(resAddress).join(", ");
  const { street_address, zipcode, city, state, country } = customerProfile;
  const customer_id = customerProfile?._id;

  const [placeOrder] = useMutation(PLACE_ORDER, {
    onCompleted(res) {
      console.log("da", res);
      handleClose();
      alert("Your order is placed successfully");
      dispatch(clearCart());
      history.push("/order-confirm");
    },
    onError(e) {
      console.log("--dfd", e);
    },
  });

  const handlePlaceOrder = async (stripe, elements) => {
    // if (!isPickupOnlyRes && !selectedAddress) {
    //   alert("Select a delivery address");
    //   return;
    // }

    const orderData = {
      cart: cart,
      customer_id,
      first_name: customerProfile?.first_name,
      last_name: customerProfile?.first_name,
      delivery_type: isPickupOnlyRes ? 2 : 1,
      delivery_address: ``,
      order_date_time: new Date().toISOString(),
      amount: parseFloat(totalAmount.toFixed(2)),
      delivery_fee: deliveryFee,
      taxes,
      instruction: cart[0]?.instruction,
      amount_details: {
        tip,
      },
      description: {
        tip: tip,
        subTotalAmount,
        tax: taxes,
      },
    };

    try {
      // Make an HTTP POST request to your backend endpoint to create a PaymentIntent
      const response = await axios.post(
        "http://localhost:3002/payment/create-payment-intent",
        orderData,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      // Assuming the response from your backend includes the client secret for the PaymentIntent
      const clientSecret = response.data.clientSecret;
      const paymentIntentId = response.data.paymentIntentId;
      // console.log(
      //   response.data.clientSecret + " * ",
      //   response.data.paymentIntentId
      // );

      // Use Stripe.js and Elements to handle payment confirmation
      const stripe = await stripePromise;
      // const elements = useElements();
      const cardElement = elements.getElement(CardElement);

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: "Customer Name", // Replace with actual customer name
            // Add more billing details as needed (address, email, phone, etc.)
          },
        },
      });
      console.log(result.error);
      if (result.error) {
        // Payment failed
        console.error(result.error.message);
        alert("Payment failed. Please try again.");
      } else {
        placeOrder({
          variables: {
            customer_id: customerProfile._id.toString(),
            delivery_type: isPickupOnlyRes ? 2 : 1,
            first_name: customerProfile.first_name,
            last_name: customerProfile.last_name,
            delivery_address: "",
            order_date_time: moment().toISOString(),
            total_amount: subTotalAmount,
            delivery_fee: deliveryFee,
            taxes,
            instruction: cart[0]?.instruction,
            tip: parseFloat(tip),
            paymentIntentId,
            orderOption,
            cart: cart.map((item) => {
              return {
                ...item,
                dishes: item.dishes.map((itemDish) => {
                  return {
                    ...itemDish,
                    dish_price: parseFloat(itemDish.dish_price),
                  };
                }),
              };
            }),
          },
        });
        // Payment successful
        console.log("Payment succeeded!");
        handleClose(); // Close the dialog
        // dispatch(clearCart());
        // alert(
        //   `Your order has been sent to the merchant for preparation. Please confirm your order upon arrival. The merchant has the right to request ID for age verification. If you are above 36 years of age and do not meet our financial assistance criteria, the merchant may cancel your order.`
        // );

        // history.push("/");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error processing payment. Please try again.");
    }
  };

  if (cart && !cart.length) {
    history.push("/");
    return <></>;
  }

  return (
    <>
      <h1 style={{ textAlign: "center", marginTop: 20 }}>Checkout Page</h1>
      <div
        style={{
          display: "flex",
          justifyContent: "stretch",
          marginTop: "50px",
        }}
      >
        <div style={{ backgroundColor: "white", flex: 1 }}>
          <List sx={{ pt: 0 }}>
            <div style={{ paddingLeft: 10, paddingBottom: 20 }}>
              <Typography style={{ alignSelf: "center", textAlign: "center" }}>
                Ordered Items
              </Typography>

              {cart?.length > 0 &&
                cart.map((cartItem, index) => {
                  return (
                    cartItem?.dishes?.length > 0 &&
                    cartItem?.dishes.map((dish, dishIndex) => (
                      <ListItem key={index}>
                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-between",
                            paddingTop: 0,
                            paddingBottom: 0,
                            paddingLeft: 100,
                            paddingRight: 100,
                          }}
                        >
                          <Typography
                            variant="body1"
                            color="black"
                            style={{ alignSelf: "center", textAlign: "center" }}
                          >
                            {`${dish?.quantity}  ${dish?.dish_name}`}
                          </Typography>
                          <Typography
                            variant="body1"
                            color="black"
                            style={{ alignSelf: "center", textAlign: "center" }}
                          >
                            {`$ ${dish.dish_price}`}
                          </Typography>
                        </div>
                      </ListItem>
                    ))
                  );
                })}

              <ListItem>
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingLeft: 100,
                    paddingRight: 100,
                  }}
                >
                  <Typography
                    variant="body1"
                    color="black"
                    style={{ alignSelf: "center", textAlign: "center" }}
                  >
                    Total Amount:
                  </Typography>
                  <Typography
                    variant="body1"
                    color="black"
                    style={{ alignSelf: "center", textAlign: "center" }}
                  >
                    {`$ ${subTotalAmount.toFixed(2)}`}
                  </Typography>
                </div>
              </ListItem>
            </div>
          </List>
          {/* {isPickupOnlyRes ? (
            <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              Pickup Address: {pickupAddress}
            </Typography>
          ) : (
            <form style={{ marginRight: 30, marginLeft: 30 }}>
              {deliveryAddressList?.length > 0 && (
                <TextField
                  id="selectedAddress"
                  select
                  fullWidth
                  label="selected delivery Address"
                  style={{ color: "black", marginBottom: 10 }}
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                >
                  {deliveryAddressList.map((option) => (
                    <MenuItem
                      key={option.delivery_address}
                      value={option.delivery_address}
                    >
                      {option.delivery_address}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                variant="outlined"
                margin="normal"
                fullWidth
                name="newAddess"
                label="add new address"
                type="text"
                id="newAddess"
                value={newAddess}
                onChange={(e) => setNewAddess(e.target.value)}
              />
              <Button
                disabled={!newAddess}
                variant="outlined"
                style={{ backgroundColor: "black", color: "white" }}
                onClick={() => addDeliveryAddressesApi(newAddess)}
              >
                Add
              </Button>
            </form>
          )} */}
          {/* <Button>Add a delivery Addres</Button> */}
        </div>
        <div
          style={{
            backgroundColor: "#F2F3F5",
            flex: 0.7,
            paddingLeft: 50,
            paddingRight: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 0,
            }}
          >
            <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              Subtotal Amount:
            </Typography>
            <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              {`$ ${subTotalAmount.toFixed(2)}`}
            </Typography>
          </div>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 0,
            }}
          >
            {/* <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              Delivery Fee:
            </Typography>
            <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              {`$ ${deliveryFee}`}
            </Typography> */}
          </div>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 0,
            }}
          >
            <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              Taxes:
            </Typography>
            <Typography
              variant="body1"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              {`$ ${taxes}`}
            </Typography>
          </div>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 10,
              paddingBottom: 0,
            }}
          >
            <div>
              <Typography
                variant="body1"
                color="black"
                style={{ alignSelf: "center", textAlign: "center" }}
              >
                Tip:
              </Typography>
            </div>
            <div
              style={{
                width: "80%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Typography
                variant="body1"
                color="black"
                style={{
                  alignSelf: "center",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onClick={() => {
                  onChangeTip("15");
                }}
              >
                15% &nbsp;
              </Typography>
              <Typography
                variant="body1"
                color="black"
                style={{
                  alignSelf: "center",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onClick={() => {
                  onChangeTip("18");
                }}
              >
                18% &nbsp;
              </Typography>
              <Typography
                variant="body1"
                color="black"
                style={{
                  alignSelf: "center",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onClick={() => {
                  onChangeTip("20");
                }}
              >
                20% &nbsp;
              </Typography>
              <Typography
                variant="body1"
                color="black"
                style={{
                  alignSelf: "center",
                  textAlign: "center",
                  // width: "fit-content",
                  width: "15%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Input
                  type="number"
                  value={tip}
                  onChange={(e) => {
                    if (e.target.value >= 0 && e.target.value <= 100) {
                      onChangeTip(e.target.value.replace(/^0+/, ""));
                    }
                  }}
                  className={classes.input}
                  // inputProps={{
                  //   min: -1,
                  //   max: 100,
                  //   step: 1,
                  //   pattern: "\\d*",
                  //   onKeyDown: (e) => {
                  //     if (e.key === "." || e.key === "-") {
                  //       e.preventDefault();
                  //     }
                  //   },
                  // }}
                ></Input>
                %
              </Typography>
            </div>
          </div>
          100% of tips will go to the restaurant.
          <br />
          You save {savedAmount} dollars on this order.
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 0,
            }}
          >
            <Typography
              variant="h6"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              Total:
            </Typography>
            <Typography
              variant="h6"
              color="black"
              style={{ alignSelf: "center", textAlign: "center" }}
            >
              {`$ ${totalAmount.toFixed(2)}`}
            </Typography>
          </div>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 0,
            }}
          >
            <Typography variant="body1" color="black">
              Order Option:
            </Typography>
            <input
              type="radio"
              id="order-option-dine-in"
              name="orderOption"
              value="Dine-In"
              checked={orderOption === "Dine-In"}
              onChange={handleOptionChange}
            />
            <label htmlFor="order-option-dine-in">Dine-In</label>
            <br />
            <input
              type="radio"
              id="order-option-take-out"
              name="orderOption"
              value="Take-Out"
              checked={orderOption === "Take-Out"}
              onChange={handleOptionChange}
            />
            <label htmlFor="order-option-take-out">Take-Out</label>
            <br />
          </div>
          <div
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <Button
              size="medium"
              variant="outlined"
              color="primary"
              onClick={() => handleClickOpen()}
              style={{
                alignSelf: "center",
                backgroundColor: "green",
                color: "white",
                marginTop: 30,
                paddingLeft: 100,
                paddingRight: 100,
              }}
            >
              Place Order
            </Button>
          </div>
        </div>
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle
            style={{ textAlign: "center", borderBottom: "1px solid #ccc" }}
          >
            Payment Details
          </DialogTitle>
          <div style={{ padding: "20px", textAlign: "center" }}>
            <Elements stripe={stripePromise}>
              <PaymentForm handlePlaceOrder={handlePlaceOrder} />
            </Elements>
          </div>
        </Dialog>
      </div>
    </>
  );
}
