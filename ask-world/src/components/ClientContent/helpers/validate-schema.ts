import * as yup from "yup";

export const validateSchema = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: yup.ObjectSchema<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): Promise<string | null> => {
  let errorMessage: string | null = null;

  try {
    await schema.validate(payload);
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) {
      errorMessage = "Unknown error";
      return errorMessage;
    }

    errorMessage = error.message;
  }

  return errorMessage;
};
