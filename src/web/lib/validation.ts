import * as Yup from "yup";

// Shared Yup building blocks so every form reports the same messages.
export const v = {
  email: () => Yup.string().trim().email("Enter a valid email address.").required("Email is required."),
  required: (label: string) => Yup.string().trim().required(`${label} is required.`),
  phone: () =>
    Yup.string()
      .trim()
      .matches(/^[+()\d\s.-]{7,20}$/, "Enter a valid phone number."),
  password: () =>
    Yup.string()
      .min(10, "Use at least 10 characters.")
      .required("Password is required."),
  zip: () => Yup.string().trim().matches(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."),
  money: (label = "Amount") =>
    Yup.number().typeError(`${label} must be a number.`).min(0, `${label} can't be negative.`).required(`${label} is required.`),
  positive: (label = "Value") => Yup.number().typeError(`${label} must be a number.`).moreThan(0, `${label} must be more than 0.`),
};

export { Yup };
