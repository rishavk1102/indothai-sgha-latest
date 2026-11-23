import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Breadcrumb, Card, Form, InputGroup, Table, Badge } from 'react-bootstrap';
import { IoChevronBackOutline } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext.js";
import { getSocket } from "../../context/socket.js";
import GifLoder from '../../interfaces/GifLoder';
import { useDebounce } from 'use-debounce'; // First, install it via npm
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import api from "../../api/axios.js";
import { EMPLOYEE_ROUTES } from "../../components/EmployeePageChrome";

const Fhr_view = ({ fhr_id, page_name, onClose }) => {
    const { role, roleId } = useAuth(); // Get roleId from the context
    const [loading, setLoading] = useState(true);  // Block UI until all fetches succeed
    const [unauthorized, setUnauthorized] = useState(false); // Show Dialog if error
    const socket = getSocket();
    const navigate = useNavigate();
    const [fhrData, setFhrData] = useState(null);
    const [rating, setRating] = useState(null);
    const [linkedInvoice, setLinkedInvoice] = useState(null);


    useEffect(() => {
        if (!socket || !fhr_id) return;

        const fetchFhr = () => {
            socket.emit("view-full-fhr-by-id", {
                role_id: roleId,
                page_name,
                fhr_id
            });
        };

        const handleSuccess = (data) => {
            setFhrData(data);
            setLoading(false);
            if (data?.status === 'Completed' && page_name) {
                api
                    .get(`/edit_fhr/fhr-rating/${encodeURIComponent(page_name)}/${fhr_id}`)
                    .then((res) => {
                        setRating(res.data?.rating || null);
                        setLinkedInvoice(res.data?.invoice || null);
                    })
                    .catch(() => {
                        setRating(null);
                        setLinkedInvoice(null);
                    });
            } else {
                setRating(null);
                setLinkedInvoice(null);
            }
        };

        const handleError = (error) => {
            const isPermissionError =
                error.message?.includes("Missing role_id") ||
                error.message?.includes("Page") ||
                error.message?.includes("Permission denied");

            if (isPermissionError) {
                setUnauthorized(true);
            } else {
                console.warn("FHR view error:", error.message);
            }
            setLoading(false);
        };

        fetchFhr();

        socket.on("view-full-fhr-by-id-success", handleSuccess);
        socket.on("view-full-fhr-by-id-error", handleError);

        return () => {
            socket.off("view-full-fhr-by-id-success", handleSuccess);
            socket.off("view-full-fhr-by-id-error", handleError);
        };
    }, [socket, roleId, page_name, fhr_id]);



    const handleDialogHide = () => {
        if (onClose) onClose();
        else navigate(-1);
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

    if (loading) {
        return <div className='loderDiv'><GifLoder /></div>;
    }
    return (
        <>
            <Row>
                <Col md={12} lg={12} className="mt-0">
                    <Card className="border-0 shadow-0">
                        <Table bordered className="fhrreportTable">
                            <thead>
                                <tr>
                                    <th colSpan={5} bgcolor="#9e52a3" style={{
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '18px',
                                        padding: '15px 10px',
                                        background: '#9e52a3',
                                        color: '#fff'
                                    }}>
                                        <h5 className="mb-0">FLIGHT HANDLING REPORT</h5>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={3} className="py-0">
                                        <span className="border-bottom d-block py-2"><b >Flight Handling Report No. :</b> {fhrData?.airport?.iata}/-/24-25</span>
                                        <div className="border-bottom d-flex gap-2">
                                            <span className="w-50 py-2"><b >Date : </b> {new Date(fhrData?.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            {/* <span className="py-2"><b >SAC CODE  : </b> 00996761</span> */}
                                        </div>
                                        <div className="py-2">
                                            <span className="d-block text-secondary">Service Provider :</span>
                                            <h6 className="mb-0 mt-2">{fhrData?.business?.name}</h6>
                                            <p className="my-1">{fhrData?.business?.address1}, {fhrData?.business?.city} - {fhrData?.business?.pincode}, {fhrData?.business?.state}, {fhrData?.business?.country}</p>
                                            <p className="my-1"><b>GSTIN :</b> {fhrData?.business?.gstin}</p>
                                        </div>
                                    </td>
                                    <td colSpan={2} className="text-center px-4">
                                        <img src={require("../../assets/images/footer_logo.png")} alt="Logo" style={{ width: '180px', height: 'auto' }} />
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3} style={{ verticalAlign: 'top' }}>
                                        <div className="py-2">
                                            <span className="d-block text-secondary">Service Provided To :</span>
                                            <h6 className="mb-0 mt-2">{fhrData?.client?.name}</h6>
                                            <p className="my-1">{fhrData?.client?.address1}, {fhrData?.client?.city} - {fhrData?.client?.pincode}, {fhrData?.client?.state}, {fhrData?.client?.country}</p>
                                            <p className="my-1"><b>GSTIN :</b> {fhrData?.client?.gstin}</p>
                                            <p className="my-1"><b>OPERATOR : </b>{fhrData?.business?.name}</p>
                                        </div>
                                    </td>
                                    <td colSpan={2}>
                                        <ul className="lstrepfhr">
                                            <li><b>Category :</b> {fhrData?.Fhr_type}</li>
                                            <li><b>Airline :</b> {fhrData?.airline?.airline_name}</li>
                                            <li><b>Aircraft Type :</b> {fhrData?.aircraft?.type_name}</li>
                                            <li><b>IEC No. :</b> {fhrData?.basic_details?.ice_no} </li>
                                            <li><b>EPCG No. :</b>{fhrData?.basic_details?.epcg_no}</li>
                                            <li><b>Country of Origin of Services :</b> {fhrData?.basic_details?.country_of_origin_of_service}</li>
                                            <li><b>Place of Delivery of Service :</b> {fhrData?.basic_details?.place_of_delivery_of_service}</li>

                                        </ul>
                                    </td>
                                </tr>
                                <tr className="table-secondary">
                                    <td colSpan={5} className="py-2">
                                        <h6 className="d-flex align-items-center justify-content-between gap-2 mb-0">
                                            <span>ARRIVAL DETAILS</span>
                                            <span style={{ fontSize: '14px' }}><small>STATUS </small> : {fhrData?.arrival_details?.status}</span>
                                        </h6>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Weight (MTOW) :</b> {fhrData?.arrival_details?.flight_weight}</td>
                                    <td><b>Flight No. :</b> {fhrData?.arrival_details?.flight_no}</td>
                                    <td><b>Regn. :</b> {fhrData?.arrival_details?.flight_region}</td>
                                    <td><b>Type :</b> {fhrData?.arrival_details?.flight_type}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Operator :</b>{fhrData?.arrival_details?.operator}</td>
                                    <td><b>Bay No :</b>{fhrData?.arrival_details?.bay_no}</td>
                                    <td colSpan={2}><b>Gate No. :</b>{fhrData?.arrival_details?.gate_no}</td>
                                </tr>
                                <tr>
                                    <td><b>Airport  :</b>{fhrData?.arrival_details?.airport}</td>
                                    <td>
                                        <b>STA :</b>{" "}
                                        {fhrData?.arrival_details?.sta
                                            ? new Date(fhrData.arrival_details.sta).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>
                                    <td>
                                        <b>ATA :</b>{" "}
                                        {fhrData?.arrival_details?.ata
                                            ? new Date(fhrData.arrival_details.ata).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>

                                    <td colSpan={2}><b>STA ATA Diff :</b>{fhrData?.arrival_details?.sta_ata_diff}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Crew  :</b>{fhrData?.arrival_details?.crew_count}</td>
                                    <td><b>Pax  :</b>{fhrData?.arrival_details?.pax_members}</td>
                                    <td>
                                        <b>First Bag. :</b>{" "}
                                        {fhrData?.arrival_details?.loading_start
                                            ? new Date(fhrData.arrival_details.loading_start).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>

                                    <td>
                                        <b>Last Bag. :</b>{" "}
                                        {fhrData?.arrival_details?.loading_over
                                            ? new Date(fhrData.arrival_details.loading_over).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>
                                </tr>

                                <tr className="table-secondary">
                                    <td colSpan={5} className="py-2">
                                        <h6 className="d-flex align-items-center justify-content-between gap-2 mb-0">
                                            <span>DEPARTURE DETAILS</span>
                                            <span style={{ fontSize: '14px' }}><small>STATUS </small> : {fhrData?.departure_details?.status}</span>
                                        </h6>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Weight (MTOW) :</b>{fhrData?.departure_details?.flight_weight}</td>
                                    <td><b>Flight No. :</b>{fhrData?.departure_details?.flight_no}</td>
                                    <td><b>Regn. :</b>{fhrData?.departure_details?.flight_region}</td>
                                    <td><b>Type :</b>{fhrData?.departure_details?.flight_type}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Operator :</b> {fhrData?.departure_details?.operator}</td>
                                    <td><b>Bay No :</b>{fhrData?.departure_details?.bay_no}</td>
                                    <td colSpan={2}><b>Gate No. :</b>{fhrData?.departure_details?.gate_no}</td>
                                </tr>
                                <tr>
                                    <td><b>Airport  :</b>{fhrData?.departure_details?.airport}</td>
                                    <td>
                                        <b>STA :</b>{" "}
                                        {fhrData?.departure_details?.std
                                            ? new Date(fhrData.departure_details.std).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>
                                    <td>
                                        <b>ATA :</b>{" "}
                                        {fhrData?.departure_details?.atd
                                            ? new Date(fhrData.departure_details.atd).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>
                                    <td colSpan={2}><b>STA ATA Diff :</b>{fhrData?.departure_details?.std_atd_diff}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Crew  :</b>{fhrData?.departure_details?.crew_count}</td>
                                    <td><b>Pax  :</b>{fhrData?.departure_details?.pax_members}</td>
                                    <td>
                                        <b>First Bag. :</b>{" "}
                                        {fhrData?.departure_details?.loading_start
                                            ? new Date(fhrData.departure_details.loading_start).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>

                                    <td>
                                        <b>Last Bag. :</b>{" "}
                                        {fhrData?.departure_details?.loading_over
                                            ? new Date(fhrData.departure_details.loading_over).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })
                                            : "N/A"}
                                    </td>

                                </tr>
                                <tr className="table-secondary">
                                    <td colSpan={5} className="py-2">
                                        <h6 className="d-flex align-items-center justify-content-between gap-2 mb-0">
                                            <span>MANPOWER DETAILS</span>
                                        </h6>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>Arrival Wheel Chair :</b>{fhrData?.man_power_details?.arrival_wheel_chair}</td>
                                    <td><b>Departure Wheel Chair :</b>{fhrData?.man_power_details?.departure_wheel_chair}</td>
                                    <td><b>Total Wheel Chair :</b>{fhrData?.man_power_details?.total_wheel_chair}</td>
                                    <td><b>MAAS :</b>{fhrData?.man_power_details?.maas}</td>
                                </tr>
                                <tr className="table-secondary">
                                    <td colSpan={5} className="py-2">
                                        <h6 className="d-flex align-items-center justify-content-between gap-2 mb-0">
                                            <span>CARGO DETAILS</span>
                                        </h6>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2}><b>No. of Trips :</b>{fhrData?.cargo_details?.no_of_trips}</td>
                                    <td><b>Start Time :</b>{new Date(fhrData?.cargo_details?.start_time).toLocaleString("en-GB", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                    })}</td>
                                    <td><b>End Time :</b>{new Date(fhrData?.cargo_details?.end_time).toLocaleString("en-GB", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                    })}</td>
                                    <td><b>Total Time (mins) :</b>{fhrData?.cargo_details?.total_time}</td>
                                </tr>
                                <tr className="table-secondary">
                                    <td colSpan={5} className="py-2">
                                        <h6 className="d-flex align-items-center justify-content-between gap-2 mb-0">
                                            <span>EQUIPMENT DETAILS</span>
                                        </h6>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Description</th>
                                    <th>Total No</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Total Mins</th>
                                </tr>
                                <tr>
                                    <td>ACU (per start)</td>
                                    <td>N/A</td>
                                    <td>N/A</td>
                                    <td>N/A</td>
                                    <td>N/A</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="py-3">
                                        <p className="mb-0">
                                            I, {fhrData?.declaration1} on behalf of {fhrData?.declaration2}
                                            hereby certify that services asked for above were received from <b>{fhrData?.business?.name}</b> and I undertake to pay the charges on demand for the above services at the rated currently applicable and agree to abide by the terms and conditions in this respect.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="py-2" style={{ verticalAlign: 'top' }}>
                                        <span className="text-secondary mb-2 d-block">Name & Sign of</span>
                                        <h6> {fhrData?.business?.name}</h6>
                                        <p>Representative :</p>
                                    </td>
                                    <td colSpan={2} className="text-center px-4">
                                        <span className="d-block" style={{ height: '100px' }}>

                                        </span>
                                        <hr />
                                        <p>Name/Sign/Contact Number of Operator/Agent</p>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={5} bgcolor="#9e52a3" style={{
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '18px',
                                        padding: '15px 10px',
                                        background: '#9e52a3',
                                        color: '#fff'
                                    }}>
                                        <h6 style={{ margin: '0 0 8px 0' }}>{fhrData?.business?.name}</h6>
                                        <p className="mb-1" style={{ fontSize: '12px', fontWeight: '400', letterSpacing: '0.5px' }}>
                                            Bank : {fhrData?.business?.bank} | Branch : {fhrData?.business?.branch} | A/c No : {fhrData?.business?.account_no}
                                        </p>
                                        <p className="mb-1" style={{ fontSize: '12px', fontWeight: '400', letterSpacing: '0.5px' }}>
                                            RTGS/NEFT IFSC : {fhrData?.business?.ifsc} | SWIFT Code : {fhrData?.business?.swift_code} | CIN : {fhrData?.business?.cin}
                                        </p>
                                        <p className="mb-0" style={{ fontSize: '12px', fontWeight: '400', letterSpacing: '0.5px' }}>
                                            Email : {fhrData?.business?.email} | Mobile :{fhrData?.business?.phone}
                                        </p>
                                    </td>
                                </tr>

                            </tfoot>
                        </Table>
                    </Card>
                </Col>
            </Row>

            {rating ? (
                <Row className="mt-3">
                    <Col md={12}>
                        <Card className="p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2 gap-2 flex-wrap">
                                <h5 className="mb-0">Tariff rating</h5>
                                <div className="d-flex align-items-center gap-2">
                                    <Badge bg={rating.status === 'Rated' ? 'success' : 'warning'}>
                                        {rating.status}
                                    </Badge>
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
                                </div>
                            </div>
                            <div className="text-muted small mb-2">
                                Rating date: {rating.rating_date || '—'}
                                {rating.currency ? ` · ${rating.currency}` : ''}
                                {rating.tariff_id ? ` · Tariff #${rating.tariff_id}` : ''}
                            </div>
                            {rating.reason ? (
                                <div className="alert alert-warning py-2">{rating.reason}</div>
                            ) : null}
                            <Table responsive hover size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Type</th>
                                        <th className="text-end">Qty</th>
                                        <th className="text-end">Rate</th>
                                        <th className="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rating.lines || []).map((line) => (
                                        <tr key={line.charge_line_id}>
                                            <td>{line.description}</td>
                                            <td>{line.line_type}</td>
                                            <td className="text-end">{line.qty}</td>
                                            <td className="text-end">{line.unit_rate}</td>
                                            <td className="text-end">{line.amount}</td>
                                        </tr>
                                    ))}
                                    {!rating.lines?.length ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-3">
                                                No charge lines yet.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </Table>
                        </Card>
                    </Col>
                </Row>
            ) : null}
        </>
    );
};

export default Fhr_view;
