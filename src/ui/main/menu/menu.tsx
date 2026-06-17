import { useState } from 'react';
import Dropdown from './dropDown';
import './menu.css'
import PopUp from './popUp';

function Menu(){

  const[disPopUp, setDisPopUp] = useState(false);
  const[gmailPopUp, setGmailPopUp] = useState(false);
  const[instaPopUp, setInstaPopUp] = useState(false);

  async function openLink(url : string) {
    await window.myAPI.openLinkExternally(url);
  }

    return (
        <>
          {disPopUp && (
            <div>
              <PopUp isOpen={disPopUp} setFunc={setDisPopUp}>
                <h2>Discord</h2>
                <img src='../../../../../images/discord-logo.png' className='popUp-image-dis'></img>
                <h2>@Green_EggsAndSam</h2>
                <button onClick={() => openLink("https://discord.com/users/683818607582380042")} className='popUp-btn-dis'>
                  Click Here For Profile
                </button>
              </PopUp>
            </div>
          )}
          {gmailPopUp && (
            <div>
              <PopUp isOpen={gmailPopUp} setFunc={setGmailPopUp}>
                <h2>Email</h2>
                <img src='../../../../../images/gmail-logo.png' className='popUp-image-gmail'></img>
                <h2>samharrriscarmack@gmail.com</h2>
                <button onClick={() => openLink("tomail:samharrriscarmack@gmail.com")} className='popUp-btn-gmail'>
                  Click Here To Email
                </button>
              </PopUp>
            </div>
          )}
          {instaPopUp && (
            <div>
              <PopUp isOpen={instaPopUp} setFunc={setInstaPopUp}>
                <h2>Instagram</h2>
                <img src='../../../../../images/insta-logo.png' className='popUp-image-insta'></img>
                <h2>@_sam.stl</h2>
                <button onClick={() => openLink("instaLink")} className='popUp-btn-insta'>
                  Click Here For Profile
                </button>
              </PopUp>
            </div>
          )}
          <div className='topBox'>
            <h1 className="title-text">Welcome To Mini FRC FMS Manager</h1>
            <img className='logoImage' src='../../../../../images/fms-icon.png'/>
          </div>
          <div className='helpSection'>
            <div>
              <h2>Click Any of the Dropdowns Below for Help</h2>
            </div>
            <div className='menu-dropdown'>
              <Dropdown title='Where to Start'>
                w wwwwwwwww wwwwwwwwwwwww wwwwwwwwwwwwwwwwww wwwwwww
                wwwwww wwwww wwwwwwwww wwwwwwwwwwwww wwwww wwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
              </Dropdown>
            </div>
            <div className='menu-dropdown'>
              <Dropdown title='How to Use Teams'>
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
              </Dropdown>
            </div>
            <div className='menu-dropdown'>
              <Dropdown title='How to Use Match Results'>
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
              </Dropdown>
            </div>
            <div className='menu-dropdown'>
              <Dropdown title='Where to Match Schedule'>
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
              </Dropdown>
            </div>
            <div className='menu-dropdown'>
              <Dropdown title='How to Run Matches'>
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
                wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
              </Dropdown>
              
            </div>
            <div className='contact'>
              <h3>For Any Addition Issues, or Bugs. Please Feel Free to Contact GreenEggs&Sam.</h3>
              <img src='../../../../../images/discord-logo.png' 
              onClick={() => setDisPopUp(true)} className='contact-discord-img'></img>
              <img src='../../../../../images/gmail-logo.png' 
              onClick={() => setGmailPopUp(true)} className='contact-gmail-img'></img>
              <img src='../../../../../images/insta-logo.png' 
              onClick={() => setInstaPopUp(true)} className='contact-insta-img'></img>
            </div>
          </div>
        </>
      )
}

export default Menu;