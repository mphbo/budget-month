export type AccountType = "asset" | "liability";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  category: string;
  amount: number;
};

export type AccountInput = {
  name: string;
  type: AccountType;
  category: string;
  amount: string;
};

export type AccountUpdateInput = AccountInput & {
  id: string;
};
