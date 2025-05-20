import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { faTrash, faGear, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Notification } from "../notification/Notification";
import type { NotificationBar } from "@/types/card-props";

const NotificationBar = ({
  notifications,
  isOpen,
  closeNotificationBar,
  userId,
}: NotificationBar) => {
  const [items, setItems] = useState(notifications.map((_, i) => i));
  const router = useRouter();

  const clearAllNotifications = () => {
    setItems([]);
  };

  useEffect(() => {
    setItems(notifications.map((_, i) => i));
  }, [notifications]);

  useEffect(() => {
    setItems(notifications.map((_, i) => i));
  }, [notifications]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as number);
        const newIndex = prev.indexOf(over?.id as number);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const navigateToSettings = () => {
    closeNotificationBar();
    router.push(`/platform/${userId}/settings/notifications`);
  };

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-md transform transition-transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ height: "100vh", zIndex: 50 }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-light">
          Notifications
        </h2>

        <button
          aria-label="Close notification"
          className="text-gray-300 hover:bg-gray-400 p-1 rounded-full focus:outline-none"
          onClick={closeNotificationBar}
        >
          <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2 relative">
          <div className="flex space-x-2">{/* Buttons (if any) here */}</div>

          <div className="flex items-center space-x-2 mb-2">
            <button
              className="text-red-200 hover:text-red-100 px-3 py-1 text-sm rounded-md"
              onClick={clearAllNotifications}
            >
              <FontAwesomeIcon icon={faTrash} className="size-4" />
            </button>

            <button
              className="text-gray-300 hover:text-gray-200 focus:outline-none"
              aria-label="settings icon"
              onClick={navigateToSettings}
            >
              <FontAwesomeIcon icon={faGear} className="size-4" />
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <p className="text-gray-300 text-center">
            You don’t have any notifications
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              {items.map((index) => {
                const notification = notifications[index];
                return (
                  <Notification
                    key={index}
                    id={index}
                    notification={notification}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default NotificationBar;
