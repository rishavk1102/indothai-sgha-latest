// components/EditUserAirports.js
import React, { useEffect, useState, useRef } from 'react';
import { Form, Card } from 'react-bootstrap';
import { getSocket } from '../context/socket';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';

const EditUserAirports = ({ user_id, page_name, onClose, initialSelectedAirports = [] }) => {
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const toastRef = useRef(null);
    const socket = getSocket();
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [airports, setAirports] = useState([]);
    const [selected, setSelected] = useState([]);

    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };

    useEffect(() => {
        if (socket) {
            socket.emit("fetch-airports", { role_id: roleId, page_name: page_name, user_id: userId });

            // Prepopulate selected from parent prop
            const ids = initialSelectedAirports.map(a => a.airport_id);
            setSelected(ids);


            socket.on("fetch-airports-success", (data) => {
                const formatted = data.map((a) => ({
                    name: `${a.name} (${a.iata})`,
                    code: a.airport_id
                }));
                setAirports(formatted);
                setLoading(false);
            });
            socket.on("fetch-airports-error", (error) => {
                const isPermissionError =
                    error.message?.includes('Missing role_id') ||
                    error.message?.includes('Page') ||
                    error.message?.includes('Permission denied');

                if (isPermissionError) {
                    setUnauthorized(true);
                } else {
                    setAirports([]);
                    console.warn('Airport fetch error:', error.message);
                }

                setLoading(false);
            });

            return () => {
                socket.off("fetch-airports-success");
                socket.off("fetch-airports-error");
            };
        }
    }, [socket]);


    const handleSubmit = async () => {
        try {
            const res = await api.put(`/promotion/user/update-airports/${page_name}/${user_id}`, {
                airport_ids: selected
            });
            onClose();
        } catch (error) {
            console.error('Duplicate airport error:', error);

            if (error.response?.status === 403) {
                setUnauthorized(true);
            }
        }
        finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleDialogHide = () => onClose();

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
        <div>
            {airports.map(a => (
                <div key={a.code} className="p-field-checkbox d-flex align-items-center gap-2 justify-content-start w-100">
                    <Checkbox 
                        inputId={a.code} 
                        value={a.code} 
                        checked={selected.includes(a.code)} 
                        onChange={e => toggleSelection(e.value)} 
                    />
                    <label htmlFor={a.code}>{a.name}</label>
                </div>
            ))}

             <div className='d-flex justify-content-end'>
                <Button 
                className='mt-3 border-0 py-2 text-white'
                style={{ fontSize: '14px' }}
                severity='warning'
                icon='pi pi-floppy'
                label='Save'
                onClick={handleSubmit}
                />
            </div>
        </div>
    );
};

export default EditUserAirports
