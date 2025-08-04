module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      code: { type: String, required: true, unique: true, index: true },
      name: { type: String, required: true, index: true },
      price: { type: Number, required: true, min: 0, index: true },
      description: String,
      imageUrl: String,
      averageRating: { type: Number, min: 0, max: 5, default: 0, index: true },
      stock: { type: Number, required: true, min: 0, default: 0, index: true },
    },
    {
      timestamps: true, // Add createdAt and updatedAt automatically
    }
  );

  // Add compound indexes for better query performance
  schema.index({ price: 1, averageRating: -1 });
  schema.index({ name: "text", description: "text" }); // Text search index

  schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Product = mongoose.model("products", schema);
  return Product;
};
