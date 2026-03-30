import { configureStore } from '@reduxjs/toolkit'
import mainSlice from './rdx-slice'

export const store = configureStore({
  reducer: {
    main: mainSlice,
  },
})