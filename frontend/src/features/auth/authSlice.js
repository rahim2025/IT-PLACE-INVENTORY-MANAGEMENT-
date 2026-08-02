import { createSlice } from "@reduxjs/toolkit";
import { api } from "../../app/apiSlice";

const TOKEN_KEY = "itplace-token";

const initialState = {
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loggedOut(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem(TOKEN_KEY);
    },
    authErrorCleared(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(api.endpoints.login.matchFulfilled, (state, action) => {
        state.token = action.payload.data.token;
        state.user = action.payload.data.user;
        state.error = null;
        localStorage.setItem(TOKEN_KEY, action.payload.data.token);
      })
      .addMatcher(api.endpoints.login.matchRejected, (state, action) => {
        state.error = action.payload?.data?.message ?? "Sign-in failed. Try again.";
      })
      .addMatcher(api.endpoints.signup.matchFulfilled, (state, action) => {
        state.token = action.payload.data.token;
        state.user = action.payload.data.user;
        state.error = null;
        localStorage.setItem(TOKEN_KEY, action.payload.data.token);
      })
      .addMatcher(api.endpoints.signup.matchRejected, (state, action) => {
        state.error = action.payload?.data?.message ?? "Sign-up failed. Try again.";
      })
      .addMatcher(api.endpoints.getMe.matchFulfilled, (state, action) => {
        state.user = action.payload.data;
      })
      .addMatcher(api.endpoints.getMe.matchRejected, (state) => {
        state.token = null;
        state.user = null;
        localStorage.removeItem(TOKEN_KEY);
      })
      .addMatcher(api.endpoints.updateMe.matchFulfilled, (state, action) => {
        state.user = action.payload.data;
      });
  },
});

export const { loggedOut, authErrorCleared } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => Boolean(state.auth.token);
export const selectIsOwner = (state) => state.auth.user?.role === "owner";
export const selectIsPendingAccess = (state) => state.auth.user?.role === "user";

export default authSlice.reducer;
