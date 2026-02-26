// components/EditUserBusinesses.js
import React, { useEffect, useState, useRef } from 'react';
import { Form, Card } from 'react-bootstrap';
import { getSocket } from '../context/socket';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import GifLoder from '../interfaces/GifLoder';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
const EditUserBusinesses = ({ user_id, page_name, onClose, initialSelectedBusinesses = [] }) => {
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const toastRef = useRef(null);
    const socket = getSocket();
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const [businesses, setBusinesses] = useState([]);
    const [selected, setSelected] = useState([]);

    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };


    useEffect(() => {
        if (!socket) return;

        socket.emit('fetch-businesses', {
            role_id: roleId,
            page_name: page_name,
            user_id: userId
        });

        // Pre-select current businesses
        const ids = initialSelectedBusinesses.map(b => b.business_id);
        setSelected(ids);

        socket.on("fetch-businesses-success", (data) => {
            const formatted = data.map((b) => ({
                name: b.name,
                code: b.business_id
            }));
            setBusinesses(formatted);
            setLoading(false);
        });

        socket.on('fetch-businesses-error', (error) => {
            const isPermissionError =
                error.message?.includes('Missing role_id') ||
                error.message?.includes('Page') ||
                error.message?.includes('Permission denied');

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                setBusinesses([]);
                console.warn('Business fetch error:', error.message);
            }
        });

        return () => {
            socket.off('fetch-businesses-success');
            socket.off('fetch-businesses-error');
        };
    }, [socket]);

    const toggleSelection = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };


    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await api.put(`/promotion/user/update-businesses/${page_name}/${user_id}`, {
                business_ids: selected
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
            {businesses.map(b => (
                <div key={b.code} className="p-field-checkbox d-flex align-items-center gap-2 justify-content-start w-100">
                    <Checkbox 
                        inputId={b.code} 
                        value={b.code} 
                        checked={selected.includes(b.code)} 
                        onChange={e => toggleSelection(e.value)} 
                    />
                    <label htmlFor={b.code}>{b.name}</label>
                </div>
            ))}
            <div className='d-flex justify-content-end'>
                <Button 
                className='mt-3 border-0 py-2 text-white'
                style={{ fontSize: '14px' }}
                severity='warning'
                icon='pi pi-floppy'
                onClick={handleSubmit}
                label='Save'
                />
            </div>
            
        </div>
    );
};

export default EditUserBusinesses
