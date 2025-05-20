import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Notification = ({
  id,
  notification,
}: {
  id: number;
  notification: { title: string; description: string };
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const createMarkup = () => {
    return { __html: notification.description };
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 shadow-md rounded-md mb-2 bg-gray-50 dark:bg-gray-700 cursor-pointer"
    >
      <p className="font-semibold text-gray-800 dark:text-light mb-2">
        {notification.title}
      </p>
      <div
        className="text-gray-600 dark:text-gray-300"
        dangerouslySetInnerHTML={createMarkup()}
      />
    </div>
  );
};
