import { gql } from "@apollo/client";

const GET_ALL_RES = gql`
  query getRestaurants($customer_city: String, $search: String) {
    getRestaurants(customer_city: $customer_city, search: $search) {
      address {
        street_address
        apt_number
        city
        state
        country
        zipcode
      }
      _id
      name
      discount
      commission
      stripeAccountId
      notificationMode
      email
      password
      delivery_option
      phone_number
      description
      restaurant_image
      timing_open
      timing_close
      token
      dishes {
        _id
        description
        dish_name
        dish_image
        dish_price
        description
        main_ingredient
        dish_category
        food_type
        res_id
      }
    }
  }
`;

const GET_CUSTOMER_PROFILE = gql`
  query getCustomerProfile($id: ID!) {
    getCustomerProfile(id: $id) {
      _id
      first_name
      last_name
      email
      password
      phone_number
      dob
      nickname
      profile_pic
      about
      token
      address {
        street_address
        apt_number
        city
        state
        country
        zipcode
      }
    }
  }
`;

const GET_CUSTOMER_ORDERS = gql`
  query getCustomerOrders($id: ID!, $page: Int, $pageSize: Int) {
    getCustomerOrders(id: $id, page: $page, pageSize: $pageSize) {
      data {
        _id
        res_id
        res_name
        customer_id
        first_name
        last_name
        order_date_time
        delivery_type
        delivery_date_time
        delivery_address
        delivery_status
        paymentIntentId
        transferId
        orderOption
        paymentDetails {
          tip
          subTotalAmount
          commissionAmount
          charges
          cutAmount
          transfer
        }
        rateId {
          _id
          orderId
          restaurantId
          rateCount
          customerId
          feedback
        }
        delivery_fee
        taxes
        tip
        instruction
        total_amount
        order_items {
          _id
          res_id
          res_menu_id
          dish_name
          description
          quantity
          dish_price
          dish_category
          food_type
        }
      }
      page
      pageSize
    }
  }
`;

export { GET_ALL_RES, GET_CUSTOMER_PROFILE, GET_CUSTOMER_ORDERS };
