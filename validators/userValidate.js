const Joi = require('joi');

const userSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    password: Joi.string().min(6).max(30).required(),
    // address: Joi.string().required(),
    // dateOfBirth: Joi.string().required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = {userSchema, loginSchema};