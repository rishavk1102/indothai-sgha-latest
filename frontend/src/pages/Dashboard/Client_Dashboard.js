import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { Col, Row, Card, Breadcrumb, Table, Alert, Badge } from 'react-bootstrap';
import { Button } from "primereact/button";
import { Dialog } from 'primereact/dialog';
import { IoChevronBackOutline } from "react-icons/io5";
import { MdOutlineDatasetLinked } from "react-icons/md";
import { FiLink } from "react-icons/fi";
import { GoUnlink } from "react-icons/go";
import { TbUnlink, TbLinkPlus } from "react-icons/tb";
import api from '../../api/axios';
import GifLoder from '../../interfaces/GifLoder';
import { getSocket } from "../../context/socket";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from 'use-debounce'; // First, install it via npm

const Client_Dashboard = () => {
    const { role, roleId } = useAuth();
    const PAGE_NAME = "Client Dashboard";
    const socket = getSocket();
    const [loading, setLoading] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const navigate = useNavigate();

    const handleDialogHide = () => navigate(-1);

    if (unauthorized) {
        return (
            <Dialog
                style={{ width: '360px' }}
                visible={unauthorized}
                onHide={handleDialogHide}
                closable={false}
                dismissableMask={false}
            >
                <div className="text-center">
                    <img src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png" alt="symbol" width="100" className="mb-3" />
                    <h5>Unauthorized</h5>
                    <p>You are not authorized</p>
                    <Button
                        label="Go Back"
                        icon="pi pi-arrow-left"
                        className="py-2 mt-3 text-white"
                        style={{ fontSize: '14px' }}
                        severity='danger'
                        onClick={handleDialogHide}
                    />
                </div>
            </Dialog>
        );
    }

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }




    return (
        <div>Client_Dashboard</div>
    )
}

export default Client_Dashboard