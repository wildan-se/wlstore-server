// app/models/user.model.js
module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, "Please fill a valid email address"],
      },
      password: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      roles: [
        {
          type: String,
          default: "user",
        },
      ],
      isActive: {
        type: Boolean,
        default: true,
      },
      addresses: [
        {
          type: {
            type: String,
            enum: ["home", "office", "other"],
            default: "home",
          },
          street: String,
          city: String,
          state: String,
          zipCode: String,
          isDefault: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    { timestamps: true } // Menambahkan createdAt dan updatedAt otomatis
  );

  schema.method("toJSON", function () {
    const { __v, _id, password, ...object } = this.toObject(); // Jangan sertakan password
    object.id = _id;
    return object;
  });

  const User = mongoose.model("users", schema);
  return User;
};
