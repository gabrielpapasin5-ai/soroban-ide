import {renderToStaticMarkup} from 'react-dom/server'
import FileIcon from "./file-icon";
import React from "react";
import { store } from "./store";

export const MainContext = React.createContext({})

export const get_file_types = (file_name) => {
    const fileTypes = {
        '.gitignore': 'ignore',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.json': 'json',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.less': 'less',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.cs': 'csharp',
        '.go': 'go',
        '.php': 'php',
        '.rb': 'ruby',
        '.swift': 'swift',
        '.kotlin': 'kotlin',
        '.dart': 'dart',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.md': 'markdown',
    };
    return fileTypes[Object.keys(fileTypes).filter(type => (new RegExp(`${type}$`)).test(file_name))[0]]
} 

const organize_folder = (branch) => {
    return branch.sort((a,b) => {
        if (a.is_dir !== b.is_dir) {
            return b.is_dir - a.is_dir
        }
        return a.name.localeCompare(b.name)
    })
}

export const path_join = (args) => {
    const os = /linux|macintosh|windows/i.exec(window.navigator.userAgent)[0].toLowerCase()
    return os == 'windows' ? args.join('\\') : args.join('/')   
}

export const makeContentList = (targetEl, branch, tree, handle_set_editor) => {
    if (branch == undefined) return;    
    const sorted_tree = organize_folder(branch)
    sorted_tree.map(branch => {
        if (branch.is_draft) {
            const wrapper_cont = document.createElement('div');
            wrapper_cont.className = "new-item-wrapper content-item";
            
            const icon_div = document.createElement('div');
            if (branch.is_dir) {
                icon_div.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="m7.976 10.072l4.357-4.357l.62.618L8.284 11h-.618L3 6.333l.619-.618z" clip-rule="evenodd"/></svg>
                `;
            } else {
                icon_div.innerHTML = renderToStaticMarkup(FileIcon({ type: 'unknown' }));
            }
            wrapper_cont.appendChild(icon_div);

            const input = document.createElement('input');
            input.className = "new-item-input";
            input.value = branch.name;
            input.placeholder = branch.is_dir ? "Folder Name" : "File Name";
            
            const handleSave = () => {
                const name = input.value.trim();
                if (name) {
                    store.dispatch({
                        type: 'main/remove_from_tree',
                        payload: branch.path
                    });
                    const newPath = branch.parentPath + '/' + name;
                    store.dispatch({
                        type: 'main/add_to_tree',
                        payload: {
                            name: name,
                            is_dir: branch.is_dir,
                            path: newPath,
                            parentPath: branch.parentPath
                        }
                    });
                } else {
                    store.dispatch({
                        type: 'main/remove_from_tree',
                        payload: branch.path
                    });
                }
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                    store.dispatch({
                        type: 'main/remove_from_tree',
                        payload: branch.path
                    });
                }
            };
            input.onblur = handleSave;
            wrapper_cont.appendChild(input);
            targetEl.append(wrapper_cont);
            setTimeout(() => input.focus(), 0);
            return;
        }

        if (branch.is_dir) {
            const wrapper_cont = document.createElement('div');
            wrapper_cont.className = "content-list-wrapper ";
            wrapper_cont.id = "list-wrapper-" + (path_join([branch.parentPath, branch.name])).replace(/\/|\\|\./g, '-');

            const content_item = document.createElement('div')
            content_item.className = "content-item"
            content_item.innerHTML = `
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619z" clip-rule="evenodd"/></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="m7.976 10.072l4.357-4.357l.62.618L8.284 11h-.618L3 6.333l.619-.618z" clip-rule="evenodd"/></svg>
                </div>
                <div class="file-name">${branch.name}</div>
            `
            const content_list = document.createElement('div')
            content_list.className = "content-list";

            content_item.onauxclick = (e) => {
                if (e.button === 2) {
                    e.preventDefault();
                    console.log('Context menu triggered (mock):', branch.name, path_join([branch.parentPath, branch.name]));
                }
            }

            content_item.onclick = (e) => {
                if (content_list.classList.contains('shown')) {
                    content_item.classList.remove('shown')
                    content_list.classList.remove('shown')
                    content_list.style.display = 'none'
                    return content_list.innerHTML = ''
                }else{
                    content_list.classList.add('shown')
                    content_item.classList.add('shown')
                    content_list.style.display = 'block'
                }
                makeContentList(content_list, tree?.filter(cbranch => cbranch.parentPath == branch.path + '/' + branch.name), tree, handle_set_editor)
            };
            wrapper_cont.appendChild(content_item);
            wrapper_cont.appendChild(content_list);             
            targetEl.append(wrapper_cont);
        }else{
            const content_item = document.createElement('div');
            content_item.className = "content-item";
            content_item.oncontextmenu = (e) => {
                e.preventDefault();
                console.log('Context menu triggered (mock):', branch.name, branch.parentPath);
            }
            content_item.innerHTML = `
                <div>${renderToStaticMarkup(FileIcon({ type:branch.name.split('.').at(-1) }))}</div>
                <div class="file-name">${branch.name}</div>
            `
            content_item.onclick = (e) => handle_set_editor(branch.name, branch.parentPath + '/' + branch.name)
            targetEl.append(content_item);
        }
    })
}