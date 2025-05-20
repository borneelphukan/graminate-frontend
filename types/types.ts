export type Id = string | number;

export type Task = {
  id: Id;
  task: string;
  columnId: Id;
  title: string;
  description?: string;
  type?: string;
  status: string;
  priority?: string;
  deadline?: string;
};

export type Column = {
  id: Id;
  title: string;
};
