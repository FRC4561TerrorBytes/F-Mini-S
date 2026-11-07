import { useEffect, useState } from "react";
import "./matchSchedule.css"

type MatchOption = {
  matchesPerTeam : number,
  matchesTotal : number
}

type MatchFinal ={
  number: number,
  redAllianceNum: number[],
  redAlliance: string[],
  blueAllianceNum: number[],
  blueAlliance: string[]
}

function MatchSchedule(){

  const op1 : MatchOption = {
    matchesPerTeam : 0,
    matchesTotal : 0
  }

  const [selected, setSelected] = useState<MatchOption>(op1);
  const [open , setOpen] = useState(false);
  const [newOpen , setNewOpen] = useState(false);
  const [amt, setAmt] = useState<number>(15);
  const [options , setOptions] = useState<MatchOption[]>([op1]);
  const [jsonUpdated, setJsonUpdated] = useState(false);
  const [teamNames, setTeamNames] = useState<MatchFinal[]>([]);

  // const getTeamName = async (teamNumber: number) => {
  //     await window.myAPI.getTeamName(teamNumber).then(setTeamName);
  // }

  const getOptions = async (newAmt : number) => {

    const [nums] = await Promise.all([
        window.myAPI.getMatchOptions(newAmt)
      ]);

    const ops : MatchOption[] = [];

    for(let i = 0; i < nums[0].length; i++){

      const op : MatchOption ={
        matchesPerTeam : nums[1][i],
        matchesTotal : nums[0][i]
      }

      ops.push(op);
    }

    setOptions(ops);

    if(options[0].matchesPerTeam == 0 && options[0].matchesTotal == 0){
      setSelected(ops[0]);
    }
  }

  const exportScheduleCSV = () => {
  const headers = [
    "Match Number",
    "Red Team 1",
    "Red Team 2",
    "Red Team 3",
    "Blue Team 1",
    "Blue Team 2",
    "Blue Team 3"
  ];

  const rows = teamNames.map(match => [
    match.number,
    ...match.redAllianceNum,
    ...match.blueAllianceNum
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "matchSchedule.csv";
  link.click();

  URL.revokeObjectURL(url);
};

  const getSchedule = async () => {
    //const tempMatches : Match[] = [];
    const tempMatches = await window.myAPI.getMatchSchedule();

    const tempTeamMatches : MatchFinal[] = [];

    for(let i = 0; i < tempMatches.length; i++){
      const tempTeamName : MatchFinal = ({
        number: tempMatches[i].number,
        redAllianceNum: [tempMatches[i].redAlliance[0],tempMatches[i].redAlliance[1],tempMatches[i].redAlliance[2]],
        redAlliance: [await getTeamName(tempMatches[i].redAlliance[0]),await getTeamName(tempMatches[i].redAlliance[1]),await getTeamName(tempMatches[i].redAlliance[2])],
        blueAllianceNum: [tempMatches[i].blueAlliance[0],tempMatches[i].blueAlliance[1],tempMatches[i].blueAlliance[2]],
        blueAlliance: [await getTeamName(tempMatches[i].blueAlliance[0]),await getTeamName(tempMatches[i].blueAlliance[1]),await getTeamName(tempMatches[i].blueAlliance[2])],
      });

      tempTeamMatches.push(tempTeamName);
    }

    setTeamNames(tempTeamMatches);
  }

  const getAndUpdateSchedule = async (matchesPerTeam : number) => {
    setJsonUpdated(true);
    await window.myAPI.updateMatchSchedule(matchesPerTeam);
    await getSchedule();
    setJsonUpdated(false);
  }

  const expandAmt =(() => {
    const newAmt = amt + 15;
    setAmt(newAmt);
    getOptions(newAmt);
  });

  const resetAmt = (() => {
    setAmt(15);
    getOptions(15);
  })

  const toggleOpen = (() => {
    setOpen(!open);
    resetAmt();
  });

  const toggleNewOpen = (() => {
    setNewOpen(!newOpen);
    if(open)
      toggleOpen();
    resetAmt();
  });

  const selectOption = ((match : MatchOption) => {
    resetAmt();
    setSelected(match);
    setOpen(false);
  });

  const getTeamName = async (team : number) => {
    
    return await window.myAPI.getTeamName(team);
  }

  useEffect(()=> {

    const startUp = async () => {

      await getSchedule();
      await getOptions(15);

    };

    startUp();

  }, [])

  const handleGenerate = (()=> {

    getAndUpdateSchedule(selected.matchesPerTeam);
    toggleNewOpen();
  })

    return (
        <>
          <div>
            <div>
              {!jsonUpdated && (
                <img alt={''} 
                className='jsonUpdated-img-true'
                src={'../../../../../images/complete-icon.png'}
                ></img>
              )
              }
              {jsonUpdated && (
                <img alt={''} 
                className='jsonUpdated-img-false'
                src={'../../../../../images/syncing-icon.png'}
                ></img>
              )
              }
          </div>
            <button
              onClick={exportScheduleCSV}
              disabled={teamNames.length === 0}
              style={{
                backgroundColor: "#555565",
                padding: "10px 30px",
                minWidth: "200px",
                borderRadius: "40px",
                border: "none",
                outlineStyle: "solid",
                outlineColor: "#353545",
                outlineWidth: "4px",
                marginBottom: "3%",
                marginLeft: "15px",
                fontSize: "100%",
                cursor: teamNames.length === 0 ? "not-allowed" : "pointer",
                opacity: teamNames.length === 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (teamNames.length > 0) {
                  e.currentTarget.style.backgroundColor = "#454555";
                }
              }}
              onMouseLeave={(e) => {
                if (teamNames.length > 0) {
                  e.currentTarget.style.backgroundColor = "#555565";
                }
              }}
            >
              Export CSV
            </button>
            <button className="new-gen" onClick={toggleNewOpen}>Generate New Match Schedule</button>
            {newOpen && (
              <div onClick={toggleNewOpen} className="popUp">
                <div onClick={(e) => e.stopPropagation()} className="popUp-content">
                    <div>
                      <button onClick={toggleOpen} className="matches-btn"><h2>Matches Per Team: {selected.matchesPerTeam}</h2> <h2>Matches Total: {selected.matchesTotal}</h2></button>
                      
                        <div>
                          <table className={`options-table ${open ? 'is-open' : ''}`}>
                            <tbody>
                              {options.map((option, index) => (
                                <tr key={index}>
                                  <td>
                                    <button className='option-btn'
                                    onClick={() =>selectOption(option)}
                                    >
                                      <h3>Matches Per Team: {option.matchesPerTeam}</h3> <h3>Matches Total: {option.matchesTotal}</h3>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <button onClick={expandAmt} className="opt-btn">More Options</button>
                          </table>
                        </div>
                      
                    <button className = 'gen-btn' onClick={handleGenerate}>Generate Schedule</button>
                  </div>
                </div>
              </div>
            )}

            <table className="schedule-table">
                  <tbody>
                    {teamNames.map((match, index) => (
                      <tr key={index}>
                        <td>
                          <div className="box-list">
                            <h3 className="matchNum-list">Match Number: {match.number}</h3>
                            <div>
                              <div className="allianceRed-list">
                                <h3 className="red-1">{match.redAllianceNum[0]}: {match.redAlliance[0]}</h3>
                                <h3 className="red-2">{match.redAllianceNum[1]}: {match.redAlliance[1]}</h3>
                                <h3 className="red-3">{match.redAllianceNum[2]}: {match.redAlliance[2]}</h3>
                              </div>
                              <div className="allianceBlue-list">
                                <h3 className="blue-1">{match.blueAllianceNum[0]}: {match.blueAlliance[0]}</h3>
                                <h3 className="blue-2">{match.blueAllianceNum[1]}: {match.blueAlliance[1]}</h3>
                                <h3 className="blue-3">{match.blueAllianceNum[2]}: {match.blueAlliance[2]}</h3>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </>
      )
}

export default MatchSchedule;