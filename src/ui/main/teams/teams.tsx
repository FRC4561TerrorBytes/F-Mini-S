import { useState, useEffect, useRef } from 'react';
import './teams.css'

type TeamInput = {
  number: string;
  name: string;
  skill: string;
};

function Teams() {
  const [teams, setTeams] = useState<TeamInput[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jsonUpdated, setJsonUpdated] = useState(false);

  const updateTeamsJson = async (teamArr : TeamInput[]) => {

    try {
      window.myAPI.updateTeamsJson(teamArr);
    } catch {
      console.log("Failed to update team json")
    }

    setTimeout(() =>{
      setJsonUpdated(false);
    }, 1000);

  }

  const updateTeams = async () => {
    try {
      const [nums, namesList, skillsList] = await Promise.all([
        window.myAPI.getTeamNumberList(),
        window.myAPI.getTeamNameList(),
        window.myAPI.getTeamSkillList()
      ]);

      const length = Math.min(nums.length, namesList.length, skillsList.length);

      const newTeams: TeamInput[] = [];
      for (let i = 0; i < length; i++) {
        newTeams.push({
          number: String(nums[i]),
          name: String(namesList[i]),
          skill: String(skillsList[i])
        });
      }

      setTeams(newTeams);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    }
  };

  useEffect(() => {

    const fetchData = async () => {
      await updateTeams();
    };

    fetchData();

  }, []);

  const handleChange = (index: number, field: keyof TeamInput, value: string, teamArr : TeamInput[]) => {

  setJsonUpdated(true);
  let cleanValue = value;

  if (field === 'number' || field === 'skill') {
    cleanValue = value.replace(/\s+/g, '');
    cleanValue = cleanValue.replace(/[^0-9]/g, '');
  }

  // if(teams[index].name == '' && teams[index].number == '' && teams[index].skill =='')
  //   removeTeam(index);

  const updatedTeams = teamArr.map((team, i) =>
    i === index ? { ...team, [field]: cleanValue } : team
  );

  setTeams(updatedTeams);

  if(allTeamsValid(updatedTeams)){
    updateTeamsJson(updatedTeams);
  }
};

  const isInteger = (str: string) => /^[0-9]+$/.test(str);


  const validTeamNumChange = (index : number, teamArr : TeamInput[]) => {

    if(!(teamArr[index].number.length > 0))
      return false;

    const num = parseInt(teamArr[index].number);
    if (!isInteger(teamArr[index].number))
      return false;

    for(let i = 0; i < teamArr.length; i++){
    
      if(parseInt(teamArr[i].number) == num && i != index)
        return false;
    }

    return true;
  }

  const allTeamsValid = (teamArr : TeamInput[]) => {
    for(let i = 0; i < teamArr.length; i++){
      if(!validTeamNumChange(i, teamArr) || !validTeamNameChange(i, teamArr) || !validTeamSkillChange(i, teamArr))
        return false;
    }

    return true;
  }

  const validTeamNameChange = (index : number, teamArr : TeamInput[]) => {

    if(!(teamArr[index].name.length > 0))
      return false;



    for(let i = 0; i < teamArr.length; i++){
      if(teamArr[i].name.toLocaleLowerCase().trim() == teamArr[index].name.toLocaleLowerCase().trim() && index != i)
        return false;
    }

    return true;
  }

  const validTeamSkillChange = (index : number, teamArr : TeamInput[]) => {

    if(!(teamArr[index].skill.length > 0))
      return false;

    if (!isInteger(teamArr[index].skill))
      return false;

    const num = parseInt(teamArr[index].skill);

    if (num < 1 || num > 5)
      return false;

    return true;
  }

  const addBlankTeam = () => {
    setTeams(prev => [...prev, { number: '', name: '', skill: '' }]);
  };

  const importCsvTeams = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const csvText = await file.text();
    await window.myAPI.importTeamCSV(csvText);
    await updateTeams();
    event.target.value = '';
  };
  
  const removeTeam = (index: number, teamArr : TeamInput[]) => {
    teamArr = teamArr.filter((_, i) => i !== index);
    handleChange(0,'number', teams[0].number, teamArr);
  };

  return (
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
      <table className="teams-table">
        <thead>
          <tr>
            <th></th>
            <th className='team-num-label'>Number</th>
            <th className='team-name-label'>Name</th>
            <th className='team-skill-label'>Skill</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={index}>
              <td>
                <button onClick={() => removeTeam(index, teams)} className='team-remove-btn'><img alt={'s'} src='../../../../../images/x-icon.png' className='team-remove-btn-image'/></button>
              </td>
              <td>
                <input className={`team-num ${validTeamNumChange(index, teams)? 'valid' : 'not-valid'}`}
                  type="text"
                  value={team.number}
                  onChange={e => handleChange(index, 'number', e.target.value, teams)}
                />
              </td>
              <td>
                <input
                  className={`team-name ${validTeamNameChange(index, teams)? 'valid' : 'not-valid'}`}
                  type="text"
                  value={team.name}
                  onChange={e => handleChange(index, 'name', e.target.value, teams)}
                />
              </td>
              <td >
                <input
                  className={`team-skill ${validTeamSkillChange(index, teams)? 'valid' : 'not-valid'}`}
                  type="text"
                  value={team.skill}
                  onChange={e => handleChange(index, 'skill', e.target.value, teams)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '595px' }}>
          <button onClick={() => addBlankTeam()} className='team-add-btn'>Add Team</button>
          <button
            type="button"
            className='team-add-btn'
            onClick={() => fileInputRef.current?.click()}
          >
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={importCsvTeams}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}

export default Teams;

