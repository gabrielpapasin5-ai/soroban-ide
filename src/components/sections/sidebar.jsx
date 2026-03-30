import React from "react";
import FileIcon from '../../assets/svg/files.svg?react';
import { Link, Outlet, useLocation } from "react-router-dom";

const SidebarSection = React.memo((props) => {
    const route = useLocation()

    React.useEffect(() => {
        console.log("route", route);
    }, [route])
    
    return (
        <div className="sidebar-section">
            <div className="icon-list">
                <div>
                    <Link to={'/'} className={"icon" + (route.pathname == '/' ? ' active' : '')}>
                        <FileIcon />
                        <div className="tooltip">Explorer</div>
                    </Link>
                </div>
            </div>
            <div className="explorer-list">
                {<Outlet />}
            </div>
        </div>
    )
})

export default SidebarSection