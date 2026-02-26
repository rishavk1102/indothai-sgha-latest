import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import '../../assets/css/home.css';
import brandLogo from '../../assets/images/logo.png';
import tub from '../../assets/images/tub.png';
import { Button } from 'primereact/button';

const Home = () => {
  const [redirectPath, setRedirectPath] = useState(null);
  const [transition, setTransition] = useState(''); // Manage transition state
  const navigate = useNavigate();

  const handleNavigation = (path, animationClass) => {
    setTransition(animationClass); // Set the animation class
    setTimeout(() => {
      navigate(path); // Navigate after animation
      setTransition(''); // Reset transition state
    }, 800); // Match the animation duration
  };


//   useEffect(() => {
// ;
//     if (token && role) {
//       if (role === 'Client') {
//         setRedirectPath('/Client/dashboard');
//       } else {
//         switch (role) {
//           case 'Admin':
//           case 'SuperAdmin':
//           case 'Founder':
//             setRedirectPath('/Graphe/dashboard/Admin');
//             break;
//           case 'HumanResource':
//             setRedirectPath('/Graphe/dashboard/Hr');
//             break;
//           case 'Accounts':
//             setRedirectPath('/Graphe/dashboard/Accounts');
//             break;
//           case 'Department_Head':
//           case 'Employee':
//           case 'Social_Media_Manager':
//           case 'Task_manager':
//             setRedirectPath('/Graphe/dashboard/employee');
//             break;
//           case 'Ex_employee':
//             setRedirectPath('/Graphe/dashboard/Ex_employee');
//             break;
//           case 'Unverified':
//             setRedirectPath('/Graphe/newuser/Unverified');
//             break;
//           default:
//             setRedirectPath('/');
//         }
//       }
//     }
//   }, []);

//   if (redirectPath) {
//     return <Navigate to={redirectPath} />;
//   }


  return (
    <div className={`home-container ${transition}`}>
      {/* Left Image */}
      <div className="image-container left">
        <h2>
          <small className='fadeInDown'>Are You</small>
          <span className='fadeInUp'>Client</span>
        </h2>
        <Button
          label="CLICK HERE"
          severity='danger'
          iconPos="right"
          className='mt-4 fadeInUp text-white custombutton'
          onClick={() => handleNavigation('/Client_login', 'slide-right')}
        />
        {/* {<img src={clientImage} alt="Client" className="image" />} */}
      </div>

      {/* Right Image */}
      <div className="image-container right">
        <h2>
          <small className='fadeInDown'>Are You</small>
          <span className='fadeInUp'>Employee</span>
        </h2>
        <Button
          label="CLICK HERE"
          severity='help'
          iconPos="right"
          className='mt-4 fadeInUp text-white custombutton'
          onClick={() => handleNavigation('/login', 'slide-left')}
        />
        {/* <img src={grapheImage} alt="Graphe" className="image" /> */}
      </div>
      <div className='brandLogo_home'>
        {/* <img src={'https://indothai-bucket-storage.blr1.cdn.digitaloceanspaces.com/assetImages/loader.gif'} alt="Client" /> */}
        <img src={brandLogo} alt="Client" />
      </div>
      <div className='tubimg'>
          <img src={tub} alt="Client" />
        </div>

      {/* Transition Overlay */}
      <div className={`transition-overlay ${transition}`} />
    </div>
  );
};

export default Home;