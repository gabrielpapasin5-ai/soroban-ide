import React from "react";
import RemoteIcon from '../../assets/svg/remote.svg?react'
import SourceIcon from '../../assets/svg/source.svg?react'
import CloudUploadIcon from '../../assets/svg/cloud-upload.svg?react'
import RadioTowerIcon from '../../assets/svg/radio-tower.svg?react'
import BellDotIcon from '../../assets/svg/bell-dot.svg?react'
import CheckAllIcon from '../../assets/svg/check-all.svg?react'
import BracketErrorIcon from '../../assets/svg/bracket-error.svg?react'
import { useAppSelector } from "../../shared/hooks";
import { get_file_types } from "../../shared/functions";

const FooterComponent = React.memo((props) => {
    const editor_indent = useAppSelector(state => state.main.indent);
    const active_file = useAppSelector(state => state.main.active_file)

    return (
        <div className="footer-section">
            <div>
                <div className="remove-item">
                    <RemoteIcon />
                </div>
                <div className="">
                    <span className="bigger-icon" style={{marginRight: 5}}>
                        <SourceIcon />
                    </span>
                    <span>main</span>
                    <span className="bigger-icon" style={{marginLeft: 5}}>
                        <CloudUploadIcon />
                    </span>
                </div>
                <div className="">
                    <span className="bigger-icon" style={{marginRight: 5}}>
                        <RadioTowerIcon />
                    </span>
                    <div>0</div>
                </div>
            </div>
            <div>
                <div className="">
                    <div>Ln {editor_indent.line}, Col {editor_indent.column}</div>
                </div>
                <div className="">
                    <div>Spaces: 4</div>
                </div>
                <div className="">
                    <div>UTF-8</div>
                </div>
                <div className="">
                    <div>LF</div>
                </div>
                <div className="">
                    <span className="bigger-icon" style={{marginRight: 5}}>
                        <BracketErrorIcon />
                    </span>
                    <div style={{textTransform: 'capitalize'}}>{active_file == undefined ? '' : get_file_types(active_file.name)}</div>
                </div>
                <div className="">
                    <span className="bigger-icon" style={{marginRight: 5}}>
                        <CheckAllIcon />
                    </span>
                    <div>Prettier</div>
                </div>
                <div className="">
                    <span className="bigger-icon" style={{marginRight: 5}}>
                        <BellDotIcon />
                    </span>
                </div>
            </div>
        </div>
    )
})

export default FooterComponent