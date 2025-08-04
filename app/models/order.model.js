// app/models/order.model.js
module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true, // Add index for better query performance
      },
      cart_items: [
        {
          productCode: {
            type: String,
            required: true,
            index: true, // Add index for product code lookups
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
          },
        },
      ],
      total_price: {
        type: Number,
        default: 0,
        min: 0,
      },
      status: {
        type: String,
        enum: ["cart", "pending", "completed", "cancelled"],
        default: "cart",
        index: true, // Add index for status queries
      },
    },
    { timestamps: true }
  );

  // Compound indexes for better performance
  schema.index({ userId: 1, status: 1 }); // Most common query pattern
  schema.index({ status: 1, createdAt: -1 }); // For admin dashboard queries

  schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Order = mongoose.model("orders", schema);
  return Order;
};
