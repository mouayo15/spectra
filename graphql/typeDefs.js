import { gql } from "apollo-server-express";

const typeDefs = gql`
  type Customer {
    _id: ID!
    first_name: String!
    last_name: String!
    email: String!
    password: String!
    phone_number: String
    dob: String
    nickname: String
    profile_pic: String
    about: String
    token: String
    address: Address
    favourites: [Restaurant]
    delivery_addresses: [Delivery_address]
  }
  type Restaurant {
    _id: ID!
    name: String!
    discount: Int!
    commission: Int
    stripeAccountId: String
    notificationMode: String
    email: String!
    password: String!
    delivery_option: Int!
    phone_number: String
    description: String
    restaurant_image: String
    timing_open: String
    timing_close: String
    token: String
    address: Address
    dishes: [Dish!]!
  }

  type Rate {
    _id: ID!
    orderId: String!
    restaurantId: String!
    # orderId: [Order]!
    # restaurantId: [Restaurant]!
    rateCount: Float!
    customerId: String!
    feedback: String
  }

  type Delivery_address {
    delivery_address: String!
  }
  type Address {
    street_address: String
    apt_number: String
    city: String
    state: String
    country: String
    zipcode: String
  }
  type Dish {
    _id: ID!
    dish_name: String!
    dish_image: String
    dish_price: Float!
    description: String
    main_ingredient: String
    dish_category: String!
    food_type: Int!
    res_id: ID!
  }

  type Order {
    _id: ID!
    res_id: ID!
    res_name: String!
    customer_id: ID!
    first_name: String
    last_name: String
    order_date_time: String
    delivery_type: Int
    delivery_date_time: String
    delivery_address: String
    delivery_status: Int
    delivery_fee: Float
    taxes: Float
    tip: Float
    instruction: String
    total_amount: Float
    order_items: [OrderItem]
    rateId: Rate
    paymentIntentId: String
    transferId: String
    orderOption: String
    paymentDetails: paymentDetails
  }

  type paymentDetails {
    tip: Float
    subTotalAmount: Float
    commissionAmount: Float
    charges: Float
    cutAmount: Float
    transfer: Float
  }

  type OrderItem {
    _id: ID
    res_id: ID
    res_menu_id: ID
    dish_name: String
    description: String
    quantity: Int
    dish_price: Float
    dish_category: String
    food_type: Int
  }

  input CustomerInput {
    customer_id: ID!
    email: String!
    first_name: String!
    last_name: String!
    phone_number: String
    description: String
    dob: String
    nickname: String
    profile_pic: String
    about: String
    street_address: String
    apt_number: String
    city: String
    state: String
    country: String
    zipcode: String
  }

  input PlaceOrderInput {
    customer_id: ID!
    first_name: String
    last_name: String
    delivery_type: Int!
    delivery_address: String
    order_date_time: String!
    total_amount: Float
    delivery_fee: Float
    taxes: Float
    instruction: String
    tip: Float
    cart: [CartInput]
    paymentIntentId: String
    orderOption: String
  }

  input CartInput {
    address: AddressInput
    _id: ID!
    name: String
    email: String
    password: String
    delivery_option: Int
    phone_number: String
    description: String
    timing_open: String
    timing_close: String
    instruction: String
    token: String
    discount: Int!
    commission: Int
    stripeAccountId: String
    restaurant_image: String
    notificationMode: String
    dishes: [dishCartInput]
  }
  input AddressInput {
    street_address: String
    apt_number: String
    city: String
    state: String
    country: String
    zipcode: String
  }

  input dishCartInput {
    dish_name: String!
    dish_image: String
    dish_price: Float!
    description: String
    main_ingredient: String
    dish_category: String!
    food_type: Int!
    res_id: ID!
    _id: ID!
    quantity: Int!
    original_dish_price: Int
  }

  input CreateDishInput {
    _id: ID
    dish_name: String!
    dish_image: String
    dish_price: Float!
    description: String
    main_ingredient: String
    dish_category: String!
    food_type: Int!
    res_id: ID!
  }

  input LoginInput {
    email: String!
    password: String!
  }
  input LogoutInput {
    email: String!
  }
  input CustomerSignupInput {
    email: String!
    password: String!
    first_name: String!
    last_name: String!
  }
  input RestaurantSignupInput {
    email: String!
    password: String!
    name: String!
    street_address: String
    apt_number: String
    city: String!
    state: String
    country: String!
    zipcode: String!
  }

  # input RestaurantorderInput {
  #     res_id: String!
  #     order_id: String!
  #     delivery_status: Int!
  # }

  type RestaurantSignUpResponse {
    object: String
    created: Int
    expires_at: Int
    url: String
  }

  type OrderOutputWithPage {
    data: [Order]
    page: Int
    pageSize: Int
  }

  input AddRatingToOrderInput {
    orderId: String!
    restaurantId: String!
    rateCount: Float!
    customerId: String!
    feedback: String
  }

  type Query {
    getRestaurants(customer_city: String, search: String): [Restaurant]
    getCustomerProfile(id: ID!): Customer!
    getCustomerOrders(id: ID!, page: Int, pageSize: Int): OrderOutputWithPage
  }

  type Mutation {
    updateCustomerProfile(customerInput: CustomerInput!): Customer!
    placeOrder(placeOrderInput: PlaceOrderInput!): Order!
    postDish(dish: CreateDishInput!): Restaurant!
    updateDish(dish: CreateDishInput!): Restaurant!
    customerLogin(loginInput: LoginInput!): Customer!
    restaurantLogin(loginInput: LoginInput!): Restaurant!
    customerLogout(logoutInput: LogoutInput!): Boolean
    restaurantLogout(logoutInput: LogoutInput!): Boolean
    customerSignup(customerSignupInput: CustomerSignupInput): Boolean
    restaurantSignup(
      restaurantSignupInput: RestaurantSignupInput
    ): RestaurantSignUpResponse!
    updateResOrderStatus(
      res_id: String!
      order_id: String!
      delivery_status: Int!
    ): [Order]
    addRatingToOrder(addRatingToOrderInput: AddRatingToOrderInput!): Rate!
  }
`;

export default typeDefs;
