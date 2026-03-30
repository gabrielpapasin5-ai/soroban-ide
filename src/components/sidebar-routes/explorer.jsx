import React from "react";
import { useAppDispatch, useAppSelector } from "../../shared/hooks";
import { MainContext, makeContentList } from "../../shared/functions";
import PerfectScrollbar from 'react-perfect-scrollbar'
import { update_active_file, update_active_files } from "../../shared/rdx-slice";
import FileIcon from "../../shared/file-icon";
import { store } from "../../shared/store";
import AngleRightIcon from '../../assets/svg/r-chevron.svg?react'
import AngleLeftIcon from '../../assets/svg/d-chevron.svg?react'
import NewFileIcon from '../../assets/svg/new-file.svg?react'
import NewFolderIcon from '../../assets/svg/new-folder.svg?react'
import RefreshIcon from '../../assets/svg/refresh.svg?react'
import CollapseIcon from '../../assets/svg/collapse.svg?react'

const ExplorerRoute = React.memo((props) => {
    const folder_structure = useAppSelector(state => state.main.folder_structure);
    const content_main_div_ref = React.useRef(undefined);
    const dispatch = useAppDispatch();
    const active_files = useAppSelector(state => state.main.active_files)
    const useMainContextIn = React.useContext(MainContext)

    const handle_display_file_list = React.useCallback(() => {
        if (Object.keys(folder_structure).length == 0) return;
        const files = folder_structure.tree.filter(content => content.parentPath == folder_structure.root)
        makeContentList(content_main_div_ref.current, files, folder_structure.tree, handle_set_editor)
    }, [folder_structure,  content_main_div_ref.current])

    const handle_set_editor = React.useCallback(async (branch_name, full_path) => {
        const get_file_content = "// File content will be loaded from-memory/cloud in the future."; 
        const active_file = {
            icon: <FileIcon type={branch_name.split('.').at(-1)} />,
            path: full_path,
            name: branch_name,
            is_touched: false
        }

        const selected_file = {
            name: branch_name,
            path: full_path,
            content: get_file_content
        }

        if (store.getState().main.active_files.findIndex(file => file.path == full_path) == -1) {
            store.dispatch(update_active_files([...store.getState().main.active_files, active_file]))
        }

        dispatch(update_active_file(active_file))

        setTimeout(() => {
            useMainContextIn.handle_set_editor(selected_file)            
        }, 0);
        
    }, [active_files])

    const handle_new_item = React.useCallback((is_dir) => {
        const draft = {
            name: '',
            is_dir: is_dir,
            path: 'draft-' + Date.now(),
            parentPath: folder_structure.root,
            is_draft: true
        }
        dispatch({ type: 'main/add_to_tree', payload: draft })
    }, [folder_structure.root])

    const handle_refresh = React.useCallback(() => {
        // Trigger a re-render by resetting state or just logging
        console.log("Refreshing explorer...");
        handle_display_file_list();
    }, [handle_display_file_list])

    const handle_collapse_all = React.useCallback(() => {
        const expandedWrappers = document.querySelectorAll('.content-list-wrapper.shown');
        expandedWrappers.forEach(wrapper => {
            const contentItem = wrapper.querySelector('.content-item');
            if (contentItem) contentItem.click(); // Toggle off
        });
    }, [])

    React.useLayoutEffect(() => {
        handle_display_file_list()
    }, [folder_structure, content_main_div_ref.current])

    return (
        <div className="folder-tree">
            <div className="title">Explorer</div>
            <div className="explorer-content-wrapper">
                <div className="content-list-outer-container">
                    <div className="project-header">
                        <div className="project-title">
                            <AngleLeftIcon />
                            <span>{folder_structure?.name || 'soroban-studio'}</span>
                        </div>
                        <div className="project-actions">
                            <NewFileIcon title="New File" onClick={() => handle_new_item(false)} />
                            <NewFolderIcon title="New Folder" onClick={() => handle_new_item(true)} />
                            <RefreshIcon title="Refresh Explorer" onClick={handle_refresh} />
                            <CollapseIcon title="Collapse Folders" onClick={handle_collapse_all} />
                        </div>
                    </div>
                    <PerfectScrollbar className="scroller">
                        <div ref={content_main_div_ref} className="content-list main"></div>
                    </PerfectScrollbar>
                </div>
                <div>
                    <AngleRightIcon />
                    <span>Outline</span>
                </div>
                <div>
                    <AngleRightIcon />
                    <span>Timeline</span>
                </div>
            </div>
        </div>
    )
})

export default ExplorerRoute