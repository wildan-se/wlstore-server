// app/models/user.model.js
module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true, // Hapus spasi di awal/akhir
      },
      email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true, // Simpan email dalam huruf kecil
        match: [/.+\@.+\..+/, "Please fill a valid email address"], // Validasi format email
      },
      password: {
        type: String,
        required: true,
      },
      roles: [
        {
          type: String, // Contoh: "user", "admin"
          default: "user",
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
