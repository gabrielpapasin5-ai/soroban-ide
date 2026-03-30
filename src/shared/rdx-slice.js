import { createSlice } from '@reduxjs/toolkit'

// Define the initial state
const initialState = {
  folder_structure: {
    name: 'soroban-studio',
    root: 'soroban-studio',
    tree: []
  },
  active_files: [],
  active_file: {},
  indent: {
    column: 0,
    line: 0
  }
}

export const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    set_folder_structure: (state, action) => {
      state.folder_structure = action.payload
    },
    update_active_files: (state, action) => {
      state.active_files = action.payload
    },
    update_active_file: (state, action) => {
      state.active_file = action.payload
    },
    update_indent: (state, action) => {
      state.indent = action.payload
    },
    add_to_tree: (state, action) => {
      state.folder_structure.tree.push(action.payload)
    },
    remove_from_tree: (state, action) => {
      state.folder_structure.tree = state.folder_structure.tree.filter(item => item.path !== action.payload)
    },
  },
})

export const { 
    set_folder_structure,
    update_active_files,
    update_active_file,
    update_indent,
    add_to_tree,
    remove_from_tree
} = mainSlice.actions

export default mainSlice.reducer