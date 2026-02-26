import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../context/socket';
import CustomToast from '../../components/CustomToast';
import GifLoder from '../../interfaces/GifLoder';
import { IoChevronBackOutline } from "react-icons/io5";

const Sgha_list = () => {
  const navigate = useNavigate();
  const { roleId } = useAuth();
  const PAGE_NAME = "Main Agreement Template";

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState('');
  const toastRef = useRef(null);
  const socket = getSocket();

  // ✅ Show toast
  const showMessage = (severity, detail) => {
    const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
    toastRef.current?.show({ severity, summary, detail });
  };

  // ✅ Fetch SGHA Templates via Socket
  const fetchSghaData = () => {
    setLoading(true);
    setError('');

    socket.emit("fetch-basic-sgha", {
      role_id: roleId,
      page_name: PAGE_NAME,
    });

    socket.once("fetch-basic-sgha-success", (data) => {
      // data may be an array or single object depending on backend
      setTemplates(Array.isArray(data) ? data : [data]);
      setLoading(false);
    });

    socket.once("fetch-basic-sgha-error", (err) => {
      setLoading(false);
      if (err.message?.includes("permission")) {
        setUnauthorized(true);
      } else {
        showMessage("error", err.message || "Failed to fetch SGHA data");
      }
      console.error("❌ SGHA Fetch Error:", err);
    });
  };

  // ✅ Refetch when SGHA data is updated
  useEffect(() => {
    fetchSghaData();

    socket.on("full-sgha-updated", () => {
      console.log("🔄 SGHA data updated — refetching...");
      fetchSghaData();
    });

    // Cleanup on unmount
    return () => {
      socket.off("fetch-basic-sgha-success");
      socket.off("fetch-basic-sgha-error");
      socket.off("full-sgha-updated");
    };
  }, []);

  // ✅ Render loading
  if (loading) return <GifLoder />;

  // ✅ Go Back
  const goBack = () => navigate(-1);

  return (
    <div className="p-4">
      <CustomToast ref={toastRef} />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">SGHA Template List</h2>
        <Button
          icon={<IoChevronBackOutline />}
          label="Back"
          className="p-button-text"
          onClick={goBack}
        />
      </div>

      {/* Unauthorized Dialog */}
      <Dialog
        header="Unauthorized"
        visible={unauthorized}
        onHide={() => setUnauthorized(false)}
        footer={<Button label="OK" onClick={() => setUnauthorized(false)} />}
      >
        <p>You do not have permission to view this page.</p>
      </Dialog>

      {/* Table */}
      <DataTable
        value={templates}
        paginator
        rows={10}
        stripedRows
        responsiveLayout="scroll"
        emptyMessage="No SGHA Templates Found"
      >
        <Column field="SGHA_Template_id" header="ID" sortable />
        <Column field="template_name" header="Template Name" sortable />
        <Column field="template_year" header="Year" sortable />
        <Column
          header="Main Agreement"
          body={(row) => row.mainAgreements?.map(m => m.Main_template_name).join(", ") || "-"}
        />
        <Column
          header="Annex A"
          body={(row) => row.annexes?.map(a => a.annex_header).join(", ") || "-"}
        />
        <Column
          header="Actions"
          body={(row) => (
            <Button
              label="View"
              icon="pi pi-eye"
              className="p-button-text"
            //   onClick={() => navigate(`/sgha/view/${row.SGHA_Template_id}`)}
            />
          )}
        />
      </DataTable>
    </div>
  );
};

export default Sgha_list;
