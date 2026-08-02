import { createSlice } from "@reduxjs/toolkit";

function getInitialMode() {
  const stored = localStorage.getItem("itplace-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const initialState = {
  mode: getInitialMode(),
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggled(state) {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("itplace-theme", state.mode);
    },
    set(state, action) {
      state.mode = action.payload;
      localStorage.setItem("itplace-theme", state.mode);
    },
  },
});

export const { toggled, set } = themeSlice.actions;
export const selectThemeMode = (state) => state.theme.mode;
export default themeSlice.reducer;
