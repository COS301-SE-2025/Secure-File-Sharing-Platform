import React, { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const ItemTypes = {
  CARD: "card",
};

// ✅ Draggable Item
function DraggableItem({ id, text, index, moveItem }) {
  const [, dragRef] = useDrag({
    type: ItemTypes.CARD,
    item: { id, index },
  });

  const [, dropRef] = useDrop({
    accept: ItemTypes.CARD,
    hover(item) {
      if (item.index !== index) {
        moveItem(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => dragRef(dropRef(node))}
      className="p-3 m-2 bg-blue-500 text-white rounded shadow cursor-move"
    >
      {text}
    </div>
  );
}

// ✅ List container
function DragList() {
  const [items, setItems] = useState([
    { id: 1, text: "🍎 Apple" },
    { id: 2, text: "🍌 Banana" },
    { id: 3, text: "🍇 Grapes" },
    { id: 4, text: "🍊 Orange" },
  ]);

  const moveItem = (fromIndex, toIndex) => {
    const updated = [...items];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setItems(updated);
  };

  return (
    <div className="w-64 mx-auto mt-10">
      {items.map((item, index) => (
        <DraggableItem
          key={item.id}
          id={item.id}
          text={item.text}
          index={index}
          moveItem={moveItem}
        />
      ))}
    </div>
  );
}