import React, { useState } from "react";
import Card from 'react-bootstrap/Card';
import { FileUpload } from 'primereact/fileupload';
import { Image } from 'primereact/image';
import { Button } from 'primereact/button';
import axios from 'axios';
import config from '../config';
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function AddDocuments({ userId, setVisibleModal2 }) {
    const { accessToken } = useAuth();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadedImages, setUploadedImages] = useState([]);

    const onSelect = (e) => {
        const file = e.files[0];
        if (selectedFiles.length + uploadedImages.length < 5 && file) {
            setSelectedFiles((prevFiles) => [...prevFiles, file]);
        } else {
            alert("You can only select up to 5 documents.");
        }
    };

    const handleDelete = (index) => {
        setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (selectedFiles.length < 2 || selectedFiles.length > 5) {
            alert("Please select between 2 and 5 images to upload.");
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("documents", file));

        try {
            const response = await api.post(
                `/documents/upload/documents/${userId}`,
                formData,
                
            );

            const newUploadedImages = response.data.data.map(doc => doc.document_url);
            setUploadedImages(newUploadedImages);
            setSelectedFiles([]);
        } catch (error) {
            console.error("Error uploading document:", error);
            alert("Error uploading document. Please try again.");
        }
    };

    return (
        <>
            <Card className='shadow-0 bg-transparent border-0'>
                <Card.Body className="py-0">
                    <Card.Title className='d-flex justify-content-center align-items-center'>
                        
                        {(uploadedImages.length + selectedFiles.length < 5) ? (
                            <FileUpload
                                mode="basic"
                                name="documents"
                                accept="image/*"
                                maxFileSize={15000000} // 15 MB max size per file
                                onSelect={onSelect}
                                auto={false}
                                chooseLabel="Select Image"
                                className="custom-browse-button"
                            />
                        ) : (
                            <span>Maximum of 5 documents selected or uploaded</span>
                        )}
                    </Card.Title>
                   
                    <p className="text-center text-muted">
                       <em>Info:</em> <small>Please add all documents as all previous documents will be deleted on upload of new documents.</small>
                    </p>
                    <ul className='up-document'>
                        {selectedFiles.map((file, index) => (
                            <li key={index} className="d-flex align-items-center position-relative bg-transparent">
                                <Image src={URL.createObjectURL(file)} alt={`Selected Image ${index + 1}`} preview className='p-0' />
                                <Button
                                    onClick={() => handleDelete(index)}
                                    icon="pi pi-times"
                                    className='updoc_del p-0'
                                    severity='danger'
                                />
                            </li>
                        ))}

                        {uploadedImages.map((image, index) => (
                            <li key={index + selectedFiles.length} className="d-flex align-items-center position-relative bg-transparent">
                                <Image src={image} alt={`Uploaded Image ${index + 1}`} preview className='p-0' />
                            </li>
                        ))}
                    </ul>
                    <div className='d-flex justify-content-end'>
                        <Button 
                            label="Save" 
                            onClick={handleSave} 
                            disabled={selectedFiles.length < 2 || selectedFiles.length > 5} 
                            className='mt-3 border-0 py-2 text-white'
                            style={{ fontSize: '14px' }}
                            severity="warning"
                            icon='pi pi-floppy'
                        />
                    </div>
                </Card.Body>
            </Card>
        </>
    );
}

export default AddDocuments;
