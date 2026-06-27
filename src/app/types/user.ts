export type UserType = {
  id: string;
  created_at: Date;
  name: string;
  image_url: string;
};

export type UserGetByIdResponseType = UserType;

export type UserUpdateRequestType = {
  name: string;
  image_url: string;
};

export type UserUpdateResponseType = UserType;
