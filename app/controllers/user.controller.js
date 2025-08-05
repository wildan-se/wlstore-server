// app/controllers/user.controller.js
const db = require("../models");
const User = db.users;
const bcrypt = require("bcryptjs");

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send({
      message: "Profile retrieved successfully.",
      user: user,
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).send({
      message: error.message || "Error retrieving user profile.",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    // Validasi input
    if (!name) {
      return res.status(400).send({ message: "Name is required." });
    }

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({
        email: email,
        _id: { $ne: req.userId },
      });
      if (existingUser) {
        return res.status(409).send({
          message: "Email is already taken by another user.",
        });
      }
    }

    const updateData = { name, phone };
    if (email) updateData.email = email;

    const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({
        message: "Email is already taken.",
      });
    }
    console.error("Error updating user profile:", error);
    res.status(500).send({
      message: error.message || "Error updating user profile.",
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).send({
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).send({
        message: "New password must be at least 6 characters long.",
      });
    }

    // Get user with password
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Verify current password
    const passwordIsValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!passwordIsValid) {
      return res
        .status(401)
        .send({ message: "Current password is incorrect." });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(req.userId, {
      password: hashedNewPassword,
    });

    res.status(200).send({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).send({
      message: error.message || "Error changing password.",
    });
  }
};

// Add address
exports.addAddress = async (req, res) => {
  try {
    const { type, street, city, state, zipCode, isDefault } = req.body;

    if (!street || !city) {
      return res.status(400).send({
        message: "Street and city are required.",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Add new address
    user.addresses.push({
      type: type || "home",
      street,
      city,
      state: state || "",
      zipCode: zipCode || "",
      isDefault: isDefault || user.addresses.length === 0, // First address is default
    });

    await user.save();

    res.status(201).send({
      message: "Address added successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send({
      message: error.message || "Error adding address.",
    });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { type, street, city, state, zipCode, isDefault } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).send({ message: "Address not found." });
    }

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Update address
    address.type = type || address.type;
    address.street = street || address.street;
    address.city = city || address.city;
    address.state = state || address.state;
    address.zipCode = zipCode || address.zipCode;
    address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

    await user.save();

    res.status(200).send({
      message: "Address updated successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).send({
      message: error.message || "Error updating address.",
    });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).send({ message: "Address not found." });
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    // If deleted address was default, make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).send({
      message: "Address deleted successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).send({
      message: error.message || "Error deleting address.",
    });
  }
};
