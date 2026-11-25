import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Form, Badge } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { Fieldset } from 'primereact/fieldset';
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from 'primereact/button';
import { InputText } from "primereact/inputtext";
import { Calendar } from 'primereact/calendar';
import Basic_details from '../../components/form_FHR/Basic_details';
import Additional_equipment_details from '../../components/form_FHR/Additional_equipment_details';
import Arrival_details from '../../components/form_FHR/Arrival_details';
import Departure_details from '../../components/form_FHR/Departure_details';
import Manpower_details from '../../components/form_FHR/Manpower_details';
import Cargo_details from '../../components/form_FHR/Cargo_details';
import { useAuth } from "../../context/AuthContext.js";
import { getSocket } from "../../context/socket.js";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { Dialog } from "primereact/dialog";
import api from "../../api/axios.js";
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { AvatarGroup } from 'primereact/avatargroup';
import CustomToast from "../../components/CustomToast.js";
import Additional_equipment from "../../components/form_FHR/Additional_equipment.js";
import { EMPLOYEE_ROUTES } from "../../components/EmployeePageChrome";


const Edit_Fhr = () => {
    const { fhr_id } = useParams();
    const toastRef = useRef(null);
    const { role, roleId, userId } = useAuth(); // Get roleId from the context
    const PAGE_NAME = "FHR Edit"; // Page name for permission checking
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const socket = getSocket();
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1); // This will take the user back to the previous page in history
    };

    const [fhrData, setFhrData] = useState(null);
    const [fhrStatus, setFhrStatus] = useState('');
    const [declaration1, setDeclaration1] = useState('');
    const [declaration2, setDeclaration2] = useState('');
    const [value, setValue] = useState('');
    const [date, setDate] = useState(null);
    const [rating, setRating] = useState(null);
    const [linkedInvoice, setLinkedInvoice] = useState(null);
    const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
    const [requiredOpen, setRequiredOpen] = useState(false);
    const [requiredGroups, setRequiredGroups] = useState([]);
    const [requiredAction, setRequiredAction] = useState('submit');
    const arrivalRef = useRef(null);
    const departureRef = useRef(null);
    const equipmentRef = useRef(null);


    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current?.show(severity, summary, detail, severity === 'error' ? 7000 : 4000);
    };

    useEffect(() => {
        const clearPageLocalStorage = () => {
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith(`${PAGE_NAME}_`)) {
                    localStorage.removeItem(key);
                }
            });
        };

        // Clear on mount
        clearPageLocalStorage();

        // Clear on unmount
        return () => {
            clearPageLocalStorage();
        };
    }, [PAGE_NAME]);

    useEffect(() => {
        if (!socket || !fhr_id) return;

        const fetchFhrData = () => {
            socket.emit("view-fhr-by-id", {
                role_id: roleId,
                page_name: PAGE_NAME,
                fhr_id: Number(fhr_id),
            });
        };

        // Initial fetch
        fetchFhrData();

        // Success handler
        const handleSuccess = (data) => {
            setFhrData(data);
            setDate(data.issue_date ? new Date(data.issue_date) : new Date());
            setFhrStatus(data.status || '');
            setDeclaration1(data.declaration1 || '');
            setDeclaration2(data.declaration2 || '');
            setValue(data.remarks || '');
            setLoading(false);
        };

        // Error handler
        const handleError = (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                console.warn("FHR fetch error:", error.message);
            }

            setLoading(false);
        };

        // Update listener to refetch
        const handleFhrUpdated = (payload) => {
            if (String(payload?.fhr_id) === String(fhr_id)) {
                fetchFhrData();
            }
        };

        socket.on("view-fhr-by-id-success", handleSuccess);
        socket.on("view-fhr-by-id-error", handleError);
        socket.on("fhrUpdated", handleFhrUpdated);

        return () => {
            socket.off("view-fhr-by-id-success", handleSuccess);
            socket.off("view-fhr-by-id-error", handleError);
            socket.off("fhrUpdated", handleFhrUpdated);
        };
    }, [socket, fhr_id]);

    const loadRating = async () => {
        if (!fhr_id || fhrStatus !== 'Completed') {
            setRating(null);
            setLinkedInvoice(null);
            return;
        }
        try {
            const res = await api.get(
                `/edit_fhr/fhr-rating/${encodeURIComponent(PAGE_NAME)}/${fhr_id}`
            );
            setRating(res.data?.rating || null);
            setLinkedInvoice(res.data?.invoice || null);
        } catch {
            setRating(null);
            setLinkedInvoice(null);
        }
    };

    useEffect(() => {
        loadRating();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fhr_id, fhrStatus]);

    const handleDialogHide = () => navigate(-1);



    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        // Prevent change if already submitted
        if (newStatus === 'Submitted') {
            showMessage('warn', 'Cannot change status to submission.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.put(`/edit_fhr/update-fhr-status/${PAGE_NAME}/${fhr_id}`, {
                newStatus
            });
            setFhrStatus(newStatus);
            // Show success message
            showMessage('success', `Status updated successfully`);
        } catch (err) {
            console.error('FHR status update error:', err);
            const message = err.response?.data?.message || 'Failed to submit FHR.';
            showMessage('error', message);
            if (err.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const collectRequiredFromSections = async (action) => {
        const type = fhrData?.type || 'Both';
        const jobs = [];
        if (type !== 'Departure') jobs.push(arrivalRef.current?.saveIfValid?.(action));
        if (type !== 'Arrival') jobs.push(departureRef.current?.saveIfValid?.(action));
        jobs.push(equipmentRef.current?.saveIfValid?.(action));
        const results = await Promise.all(jobs.map((job) => Promise.resolve(job)));
        return results.filter((row) => row && row.ok === false);
    };

    const showRequiredDialog = (action, failed) => {
        setRequiredAction(action);
        setRequiredGroups(
            failed.map((row) => ({
                section: row.section || 'FHR',
                missing: row.missing || [],
            }))
        );
        setRequiredOpen(true);
        showMessage(
            'error',
            `Fill the required fields before ${action === 'complete' ? 'completing' : 'submitting'}.`
        );
    };

    const handleCompleteFHR = async () => {
        setLoading(true);
        try {
            const failed = await collectRequiredFromSections('completing');
            if (failed.length) {
                showRequiredDialog('complete', failed);
                return;
            }
            const res = await api.put(`/edit_fhr/update-fhr-status/${PAGE_NAME}/${fhr_id}`, {
                newStatus: 'Completed',
            });
            setFhrStatus('Completed');
            const nextRating = res.data?.rating;
            setRating(nextRating || null);
            if (nextRating?.status === 'Rated') {
                showMessage(
                    'success',
                    `Completed and rated (${nextRating.line_count || nextRating.lines?.length || 0} charge lines)`
                );
            } else if (nextRating?.status === 'Needs review') {
                const reasonText = {
                    no_tariff:
                        'No Active SGHA tariff found for this client, airport and flight date. Complete the client\'s SGHA (or add a walk-up tariff) for that date, then re-rate.',
                }[nextRating.reason] || nextRating.detail || nextRating.reason || 'check tariff match';
                showMessage('warn', `Completed, but pricing needs review. ${reasonText}`);
            } else {
                showMessage('success', 'FHR marked Completed');
            }
            await loadRating();
        } catch (err) {
            console.error('FHR complete error:', err);
            const missing = err.response?.data?.missing;
            if (Array.isArray(missing) && missing.length) {
                showRequiredDialog('complete', [{ section: 'FHR', missing }]);
            } else {
                showMessage('error', err.response?.data?.message || 'Failed to complete FHR.');
            }
            if (err.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRerate = async () => {
        setLoading(true);
        try {
            const res = await api.post(
                `/edit_fhr/rate-fhr/${encodeURIComponent(PAGE_NAME)}/${fhr_id}`,
                { force: true }
            );
            const nextRating = res.data?.rating;
            setRating(nextRating || null);
            if (nextRating?.status === 'Rated') {
                showMessage(
                    'success',
                    `Re-rated (${res.data?.lineCount || nextRating.lines?.length || 0} charge lines)`
                );
            } else if (nextRating?.status === 'Needs review') {
                showMessage(
                    'warn',
                    `Still needs review: ${nextRating.reason || res.data?.reason || 'check tariff'}`
                );
            } else {
                showMessage('warn', res.data?.reason || 'Re-rate finished with no rating');
            }
            await loadRating();
        } catch (err) {
            showMessage(
                'error',
                err.response?.data?.message || err.message || 'Failed to re-rate'
            );
        } finally {
            setLoading(false);
        }
    };


    const openSubmitConfirm = async () => {
        setLoading(true);
        try {
            const failed = await collectRequiredFromSections('submitting');
            if (failed.length) {
                showRequiredDialog('submit', failed);
                return;
            }
            setSubmitConfirmOpen(true);
        } catch (err) {
            showMessage(
                'error',
                err.response?.data?.message || err.message || 'Could not validate this FHR'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFHR = async () => {
        setLoading(true);
        try {
            const failed = await collectRequiredFromSections('submitting');
            if (failed.length) {
                setSubmitConfirmOpen(false);
                showRequiredDialog('submit', failed);
                return;
            }
            await api.put(`/edit_fhr/update-fhr-status/${PAGE_NAME}/${fhr_id}`, {
                newStatus: 'Submitted',
                issue_date: date,
                declaration1: declaration1,
                declaration2: declaration2,
                submitted_by: userId,
                remarks: value
            });
            setSubmitConfirmOpen(false);
            setFhrStatus('Submitted');
            showMessage('success', 'FHR submitted. All sections are locked.');
            navigate(-1);
        } catch (err) {
            console.error('FHR status update error:', err);
            const missing = err.response?.data?.missing;
            if (Array.isArray(missing) && missing.length) {
                setSubmitConfirmOpen(false);
                showRequiredDialog('submit', [{ section: 'FHR', missing }]);
            } else {
                showMessage('error', err.response?.data?.message || 'Failed to submit FHR.');
            }
            if (err.response?.status === 403) {
                setUnauthorized(true);
            }
        } finally {
            setLoading(false);
        }
    };



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
                        className="py-2 mt-3"
                        style={{ fontSize: '14px' }}
                        severity='danger'
                        onClick={handleDialogHide}
                    />
                </div>
            </Dialog>
        );
    }

    return (
        <Row>
            <Col md={6} lg={6} className="mb-4">
                <Breadcrumb>
                    <Breadcrumb.Item onClick={goBack}>
                        <IoChevronBackOutline /> Back
                    </Breadcrumb.Item>
                    <Breadcrumb.Item active>Scheduled FHR</Breadcrumb.Item>
                </Breadcrumb>
            </Col>
            <Col md={12} lg={6} className="mb-4">
                <Form.Group className="mb-0 d-flex align-items-center justify-content-end gap-2 flex-wrap">
                    {fhrStatus === 'Completed' ? (
                        <>
                            {rating ? (
                                <Badge bg={rating.status === 'Rated' ? 'success' : 'warning'}>
                                    {rating.status}
                                </Badge>
                            ) : (
                                <Badge bg="secondary">Unrated</Badge>
                            )}
                            {linkedInvoice ? (
                                <Button
                                    label={linkedInvoice.invoice_no}
                                    className="p-button-text p-button-sm p-0"
                                    onClick={() =>
                                        navigate(
                                            `${EMPLOYEE_ROUTES.billing}/${linkedInvoice.invoice_id}`
                                        )
                                    }
                                />
                            ) : null}
                            <Button
                                label="Re-rate"
                                icon="pi pi-refresh"
                                className="p-button-sm p-button-outlined"
                                onClick={handleRerate}
                                disabled={loading}
                            />
                        </>
                    ) : null}
                    <Form.Label className="mb-0">FHR Status</Form.Label>
                    <Form.Select
                        value={fhrStatus}
                        onChange={handleStatusChange}
                        disabled={['Submitted', 'Completed', 'Cancelled'].includes(fhrStatus)}
                        style={{ width: '190px', backgroundColor: '#fdcd9b' }}
                    >
                        <option value="">--- Select Status ---</option>
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending</option>
                        <option value="Submitted">Submitted</option>
                        {fhrStatus === 'Completed' ? (
                            <option value="Completed">Completed</option>
                        ) : null}
                    </Form.Select>
                </Form.Group>
            </Col>
            <Col md={12} lg={12}>
                <Row className="mx-0 fhr_form bg-light p-3 mb-3" style={{ borderRadius: '6px' }}>
                    <div className="d-flex align-items-center gap-2 justify-content-between w-100">
                        <span className="d-flex align-items-center gap-3 mb-3">
                            {loading && (<small><ProgressSpinner style={{ width: '25px', height: '25px' }} strokeWidth="2" fill="var(--surface-ground)" animationDuration=".5s" /></small>)}
                            {/* <small className="ms-2">
                                <AvatarGroup>
                                    <Avatar image="https://primefaces.org/cdn/primereact/images/avatar/amyelsner.png" shape="circle" />
                                    <Avatar image="https://primefaces.org/cdn/primereact/images/avatar/asiyajavayant.png" shape="circle" />
                                </AvatarGroup>
                            </small> */}
                        </span>
                        <span className="d-flex align-items-center gap-3 mb-3">
                            <small className="me-1 text-Secondary ">Submitted by : </small>
                            <small>
                                <AvatarGroup>
                                    <Avatar image="https://primefaces.org/cdn/primereact/images/avatar/amyelsner.png" shape="circle" />
                                </AvatarGroup>
                            </small>

                        </span>
                    </div>
                    <Col lg={3} md={4} className="px-2 position-relative">
                        <Form.Group className="mb-2">
                            <Form.Label>Issue Date</Form.Label>
                            <Calendar
                                value={date}
                                onChange={(e) => setDate(e.value)}
                                dateFormat="dd/mm/yy"
                                style={{ width: '100%' }}
                            />
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4} className="px-2">
                        <Form.Group className="mb-2">
                            <Form.Label>Category</Form.Label>
                            <Form.Select value={fhrData?.Fhr_type || ''} disabled>
                                <option>--- Select Category ---</option>
                                <option value={fhrData?.Fhr_type || ''}>
                                    {fhrData?.Fhr_type || ''}
                                </option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4} className="px-2">
                        <Form.Group className="mb-2">
                            <Form.Label>Service Provider</Form.Label>
                            <Form.Select value={fhrData?.business?.business_id || ''} disabled>
                                <option>--- Select Business ---</option>
                                <option value={fhrData?.business?.business_id}>
                                    {fhrData?.business?.name}
                                </option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4} className="px-2">
                        <Form.Group className="mb-2">
                            <Form.Label>Airport</Form.Label>
                            <Form.Select value={fhrData?.airport?.airport_id || ''} disabled>
                                <option>--- Select Airport ---</option>
                                <option value={fhrData?.airport?.airport_id}>
                                    {fhrData?.airport?.name} ({fhrData?.airport?.iata})
                                </option>
                            </Form.Select>

                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4} className="px-2">
                        <Form.Group className="mb-2">
                            <Form.Label>Service Provided To</Form.Label>
                            <Form.Select value={fhrData?.client?.client_id || ''} disabled>
                                <option>--- Select Client ---</option>
                                <option value={fhrData?.client?.client_id}>
                                    {fhrData?.client?.name}
                                </option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4} className="px-2">
                        <Form.Group className="mb-2">
                            <Form.Label>Airline</Form.Label>
                            <Form.Select value={fhrData?.airline?.airline_id || ''} disabled>
                                <option>--- Select Airport ---</option>
                                <option value={fhrData?.airline?.airline_id}>
                                    {fhrData?.airline?.airline_name} ({fhrData?.airline?.iata})
                                </option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4} className="px-2">
                        <Form.Group className="mb-2">
                            <Form.Label>Aircraft Type</Form.Label>
                            <Form.Select value={fhrData?.aircraft?.aircraft_id || ''} disabled>
                                <option>--- Select Airport ---</option>
                                <option value={fhrData?.aircraft?.aircraft_id}>
                                    {fhrData?.aircraft?.type_name}
                                </option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </Col>

            <Basic_details userId={userId} fhr_id={fhr_id} page_name={PAGE_NAME} parentStatus={fhrStatus} notify={showMessage} />
            <Arrival_details ref={arrivalRef} userId={userId} fhr_id={fhr_id} page_name={PAGE_NAME} parentStatus={fhrStatus} notify={showMessage} />
            <Departure_details ref={departureRef} userId={userId} fhr_id={fhr_id} page_name={PAGE_NAME} parentStatus={fhrStatus} notify={showMessage} />
            <Manpower_details userId={userId} fhr_id={fhr_id} page_name={PAGE_NAME} parentStatus={fhrStatus} notify={showMessage} />
            <Cargo_details userId={userId} fhr_id={fhr_id} page_name={PAGE_NAME} parentStatus={fhrStatus} notify={showMessage} />
            <Additional_equipment
                ref={equipmentRef}
                userId={userId}
                fhr_id={fhr_id}
                page_name={PAGE_NAME}
                aircraft_id={fhrData?.aircraft?.aircraft_id || fhrData?.aircraft_id}
                fhrStatus={fhrStatus}
                notify={showMessage}
            />

            <Col md={12} lg={12} className="mt-4">
                <div className="allempList fhr_form">
                    <h5 className="rol-title">Declaration</h5>
                    <ul>
                        <li className="flex-nowrap w-100" style={{ whiteSpace: 'nowrap' }}>
                            I,
                            <span className="w-100"><InputText value={declaration1} onChange={(e) => setDeclaration1(e.target.value)} className="w-100" /></span>
                            on behalf of
                            <span className="w-100"><InputText value={declaration2} onChange={(e) => setDeclaration2(e.target.value)} className="w-100" /></span>
                            hereby
                        </li>
                        <li className="W-100 d-block pt-0">
                            certify that services asked for above were received from <b>{fhrData?.business?.name}</b> and I undertake to pay the charges on demand for the above services at the rated currently applicable and agree to abide by the terms and conditions in this respect.
                        </li>
                    </ul>
                </div>
                <div className="allempList  fhr_form">
                    <h5 className="rol-title">Remarks (Optional)</h5>
                    <ul>
                        <li className="w-100">
                            <label>Any Remarks</label>
                            <InputTextarea value={value} onChange={(e) => setValue(e.target.value)} rows={5} className="w-100 mt-2 h-auto" />
                        </li>
                    </ul>
                </div>
            </Col>
            <Col md={12} lg={12} className="mt-4 text-end">
                {fhrStatus === 'Submitted' ? (
                    <Button
                        label="Mark Completed"
                        icon="pi pi-check"
                        severity="success"
                        className="py-2 me-2 text-white"
                        style={{ fontSize: "14px" }}
                        onClick={handleCompleteFHR}
                        disabled={loading}
                    />
                ) : null}
                <Button
                    label="Submit FHR"
                    icon="pi pi-check"
                    severity="warning text-white"
                    className="py-2"
                    style={{ fontSize: "14px" }}
                    onClick={openSubmitConfirm}
                    disabled={['Submitted', 'Completed', 'Cancelled'].includes(fhrStatus) || loading}
                />

            </Col>

            <Dialog
                header="Required fields missing"
                visible={requiredOpen}
                style={{ width: '32rem' }}
                modal
                onHide={() => setRequiredOpen(false)}
                footer={
                    <Button
                        label="OK"
                        onClick={() => setRequiredOpen(false)}
                    />
                }
            >
                <p className="mb-2">
                    This FHR cannot be {requiredAction === 'complete' ? 'completed' : 'submitted'} until
                    the fields below are filled. Unsaved edits are checked too — fill them, then try again.
                </p>
                {requiredGroups.map((group) => (
                    <div key={group.section} className="mb-2">
                        <strong>{group.section}</strong>
                        <ul className="mb-0 ps-3">
                            {(group.missing || []).map((item) => (
                                <li key={`${group.section}-${item}`}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </Dialog>

            <Dialog
                header="Submit FHR?"
                visible={submitConfirmOpen}
                style={{ width: '28rem' }}
                modal
                closable={!loading}
                onHide={() => {
                    if (!loading) setSubmitConfirmOpen(false);
                }}
                footer={
                    <div className="d-flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            disabled={loading}
                            onClick={() => setSubmitConfirmOpen(false)}
                        />
                        <Button
                            label="Submit & lock"
                            severity="warning"
                            loading={loading}
                            onClick={handleSubmitFHR}
                        />
                    </div>
                }
            >
                <p className="mb-2">
                    This will mark the FHR and <strong>all sections</strong> as{' '}
                    <strong>Submitted</strong>, including any still Draft or Pending.
                </p>
                <p className="mb-0 text-muted small">
                    Editing will be locked. Use each section&apos;s Save while you are still
                    working; only submit when the whole report is ready.
                </p>
            </Dialog>

            <CustomToast ref={toastRef} position="top-right" />
        </Row>
    );
};

export default Edit_Fhr;
