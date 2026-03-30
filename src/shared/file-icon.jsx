import GitFileIcon from '../assets/svg/git.svg?react'
import HTMLFileIcon from '../assets/svg/html.svg?react'
import CSSFileIcon from '../assets/svg/css.svg?react'
import JSFileIcon from '../assets/svg/javascript.svg?react'
import JSONFileIcon from '../assets/svg/json.svg?react'
import MarkdownFileIcon from '../assets/svg/markdown.svg?react'
import TSFileIcon from '../assets/svg/ts-1.svg?react'
import TTFFileIcon from '../assets/svg/ttf.svg?react'
import SVGFileIcon from '../assets/svg/svg.svg?react'
import UnknownFileIcon from '../assets/svg/unknown.svg?react'
import React from 'react'

const FileIcon = ({type}) => {
    const typeIcon = {
        gitignore: <GitFileIcon />,
        html: <HTMLFileIcon />,
        css: <CSSFileIcon />,
        js: <JSFileIcon />,
        jsx: <JSFileIcon />,
        json: <JSONFileIcon />,
        md: <MarkdownFileIcon />,
        ts: <TSFileIcon />,
        tsx: <TSFileIcon />,
        ttf: <TTFFileIcon />,
        svg: <SVGFileIcon />,
        unknown: <UnknownFileIcon />,
    }

    return typeIcon[type] || typeIcon['unknown']
}

export default FileIcon