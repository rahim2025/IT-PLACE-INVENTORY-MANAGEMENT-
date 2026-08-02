import { createSlice, nanoid } from "@reduxjs/toolkit";

const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] },
  reducers: {
    pushed: {
      reducer(state, action) {
        state.items.push(action.payload);
      },
      prepare({ message, variant = "success" }) {
        return { payload: { id: nanoid(), message, variant } };
      },
    },
    dismissed(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { pushed, dismissed } = toastSlice.actions;
export const selectToasts = (state) => state.toast.items;
export default toastSlice.reducer;
