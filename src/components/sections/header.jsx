import React from "react";
import ArrowLeftIcon from '../../assets/svg/arrow-left.svg?react'
import ArrowRightIcon from '../../assets/svg/arrow-right.svg?react'
import SearchIcon from '../../assets/svg/search.svg?react'
import PanelBlockIcon from '../../assets/svg/panel-block.svg?react'
import PanelLeftIcon from '../../assets/svg/panel-left.svg?react'
import PanelRightIcon from '../../assets/svg/panel-right-off.svg?react'
import PanelSplitIcon from '../../assets/svg/panel-off.svg?react'
import { useAppSelector } from "../../shared/hooks";

const HeaderSection = React.memo((props) => {
    const folder_structure = useAppSelector(state => state.main.folder_structure);

    return (
        <div className="header-section">
            <div className="header-main">
                <div>
                    <ArrowLeftIcon />
                    <ArrowRightIcon />
                </div>
                <div className="text-container">
                    <SearchIcon />
                    <span>{folder_structure?.name?.split(/\/|\\/).at(-1)}</span>
                </div>
            </div>
            <div className="icons-container">
                <PanelLeftIcon />
                <PanelSplitIcon />
                <PanelRightIcon />
                <PanelBlockIcon />
            </div>
        </div>
    )
})

export default HeaderSection