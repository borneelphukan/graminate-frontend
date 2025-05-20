import Button from "@/components/ui/Button";
import TextField from "../ui/TextField"; // Assuming TextField is responsive

type Item = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type CustomTableProps = {
  items: Item[];
  onItemsChange: (newItems: Item[]) => void;
};

const CustomTable = ({ items, onItemsChange }: CustomTableProps) => {
  const addItem = () => {
    const newItems = [
      ...items,
      { description: "", quantity: 1, rate: 0, amount: 0 },
    ];
    onItemsChange(newItems);
  };

  const updateItem = (
    index: number,
    key: keyof Item,
    value: string | number
  ) => {
    const updatedItems = [...items];
    const currentItem = updatedItems[index];

    let newQuantity = currentItem.quantity;
    let newRate = currentItem.rate;

    if (key === "quantity") {
      newQuantity = Number(value) || 0;
    } else if (key === "rate") {
      newRate = Number(value) || 0;
    }

    updatedItems[index] = {
      ...currentItem,
      [key]: value,
      amount: newQuantity * newRate,
    };
    onItemsChange(updatedItems);
  };

  return (
    <div className="mt-6">
      <div className="overflow-x-auto w-full">
        {" "}
        {/* Added for horizontal scrolling on small screens */}
        <table className="min-w-full w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-light">
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium">
                Item Description
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium whitespace-nowrap">
                Quantity
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium">
                Rate (₹)
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-medium">
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="border border-gray-300 dark:border-gray-600 p-2 min-w-[200px] sm:min-w-[250px]">
                  <TextField
                    value={item.description}
                    onChange={(val) => updateItem(index, "description", val)}
                    placeholder="Item or service"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2 text-center min-w-[80px] sm:min-w-[100px]">
                  <TextField
                    value={item.quantity.toString()}
                    onChange={(val) =>
                      updateItem(index, "quantity", parseFloat(val) || 0)
                    }
                    number={true}
                    width="small"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2 text-center min-w-[100px] sm:min-w-[120px]">
                  <TextField
                    value={item.rate.toString()}
                    onChange={(val) =>
                      updateItem(index, "rate", parseFloat(val) || 0)
                    }
                    number={true}
                    width="small"
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2 text-right dark:text-light min-w-[100px] sm:min-w-[120px] whitespace-nowrap">
                  ₹{item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-4">
        <Button text="+ Add Item" style="primary" onClick={addItem} />
      </div>
    </div>
  );
};

export default CustomTable;
