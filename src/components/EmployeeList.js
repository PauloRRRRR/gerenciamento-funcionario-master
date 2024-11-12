// src/components/EmployeeList.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import employeeService from '../services/employeeService';
import { useForm } from 'react-hook-form';
import { Button, TextField, Grid, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { jsPDF } from 'jspdf'; // Importa a biblioteca jsPDF

const schema = yup.object({
  contact: yup.string().required('Contato é obrigatório'),
  newPosition: yup.string(), // Opcional, apenas para promoção
}).required();

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [history, setHistory] = useState({});  // Estado para armazenar o histórico de cada funcionário
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({ open: false, employeeId: null });
  const { register, handleSubmit, setValue, reset } = useForm({
    resolver: yupResolver(schema),
  });
  const navigate = useNavigate();

  const loadEmployees = async () => {
    try {
      const employeesList = await employeeService.getEmployees();
      setEmployees(employeesList);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

  const loadEmployeeHistory = async (employeeId) => {
    try {
      const employeeHistory = await employeeService.getEmployeeHistory(employeeId);
      console.log(employeeHistory); // Verifique se os dados estão sendo retornados corretamente
      setHistory((prevHistory) => ({
        ...prevHistory,
        [employeeId]: employeeHistory,
      }));
    } catch (error) {
      console.error('Erro ao carregar histórico do funcionário:', error);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleToggleExpand = (employeeId) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(employeeId);
      loadEmployeeHistory(employeeId);  // Carregar histórico quando o funcionário for expandido
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setValue('contact', employee.contact);
    setValue('newPosition', employee.position); // Campo opcional para promoção
  };

  const handleOpenConfirmDelete = (employeeId) => {
    setConfirmDeleteDialog({ open: true, employeeId });
  };

  const handleGoToRegister = () => {
    navigate('/form'); // substitua '/register' com a rota da sua página de cadastro
  };

  const handleCloseConfirmDelete = () => {
    setConfirmDeleteDialog({ open: false, employeeId: null });
  };

  const handleConfirmDeleteEmployee = async () => {
    try {
      await employeeService.deleteEmployee(confirmDeleteDialog.employeeId);
      setEmployees((prevEmployees) =>
        prevEmployees.filter((employee) => employee.id !== confirmDeleteDialog.employeeId)
      );
      handleCloseConfirmDelete();
    } catch (error) {
      console.error('Erro ao terminar contrato do funcionário:', error);
    }
  };

  const handleSubmitForm = async (data) => {
    try {
      if (editingEmployee) {
        const updatedData = {
          contact: data.contact,
          position: data.newPosition || editingEmployee.position,
        };
        await employeeService.updateEmployee(editingEmployee.id, updatedData);
        setEmployees((prevState) =>
          prevState.map((employee) =>
            employee.id === editingEmployee.id ? { ...employee, ...updatedData } : employee
          )
        );
        setEditingEmployee(null);
        reset();
      }
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
    }
  };

  const handleBack = () => {
    setEditingEmployee(null);
    reset();
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const generatePDF = (employee) => {
    const doc = new jsPDF();
    doc.setFontSize(18);

    // Adicionando o conteúdo do currículo
    doc.text('Currículo', 105, 20, null, null, 'center');
    doc.text('Nome: ' + employee.name, 10, 30);
    doc.text('Cargo: ' + employee.position, 10, 40);
    doc.text('Departamento: ' + employee.department, 10, 50);
    doc.text('Data de Admissão: ' + formatDate(employee.hireDate), 10, 60);
    doc.text('Contato: ' + employee.contact, 10, 70);

    // Adicionando o histórico de alterações
    if (history[employee.id] && history[employee.id].length > 0) {
      doc.text('Histórico de Alterações:', 10, 80);
      let yOffset = 90;
      history[employee.id].forEach((item, index) => {
        doc.text(`Campo alterado: ${item.field}`, 10, yOffset);
        doc.text(`De: ${item.oldValue}`, 10, yOffset + 10);
        doc.text(`Para: ${item.newValue}`, 10, yOffset + 20);
        doc.text(`Data: ${formatDate(item.date)}`, 10, yOffset + 30);
        yOffset += 40;
      });
    } else {
      doc.text('Não há alterações registradas.', 10, 80);
    }

    // Gerar o PDF
    doc.save(`${employee.name}_curriculo.pdf`);
  };

  return (
    <div className="bg-white p-6 rounded-lg max-w-4xl mx-auto mt-8 text-gray-800">
      <h2 className="text-2xl font-bold text-center mb-6">Lista de Funcionários</h2>

      <div className="text-right mb-6">
        <Button variant="contained" color="primary" onClick={handleGoToRegister}>
          Cadastrar um funcionário
        </Button>
      </div>

      {editingEmployee ? (
        <form onSubmit={handleSubmit(handleSubmitForm)} className="bg-gray-100 p-6 rounded-lg">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Contato"
                {...register('contact')}
                fullWidth
                variant="outlined"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Novo Cargo (opcional)"
                {...register('newPosition')}
                fullWidth
                variant="outlined"
                margin="normal"
              />
            </Grid>
          </Grid>
          <div className="flex gap-2 justify-end">
            <Button onClick={handleBack} color="secondary">Cancelar</Button>
            <Button type="submit" color="primary" variant="contained">Salvar Alterações</Button>
          </div>
        </form>
      ) : (
        <div>
          {employees.length === 0 ? (
            <p className="text-center text-gray-500">Não há funcionários cadastrados.</p>
          ) : (
            <ul>
              {employees.map((employee) => (
                <li key={employee.id} className="border-b border-gray-300 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={employee.profilePictureUrl}
                        alt="Profile"
                        className="w-16 h-16 object-cover rounded-md border border-gray-300"
                      />
                      <div>
                        <p className="text-lg font-semibold">{employee.name}</p>
                        <p className="text-gray-600 text-sm">
                          {employee.position} - {employee.department} - {formatDate(employee.hireDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleExpand(employee.id)}
                        className="bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-500 transition"
                      >
                        {expandedEmployee === employee.id ? 'Minimizar' : 'Detalhes'}
                      </button>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-500 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleOpenConfirmDelete(employee.id)}
                        className="bg-red-600 text-white py-1 px-3 rounded-md hover:bg-red-500 transition"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => generatePDF(employee)}  // Botão para gerar o PDF
                        className="bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-500 transition"
                      >
                        Baixar PDF
                      </button>
                    </div>
                  </div>

                  {expandedEmployee === employee.id && (
                    <div className="mt-4 ml-6">
                      <p className="text-sm text-gray-600">Contato: {employee.contact}</p>
                      <p className="text-sm text-gray-600">Data de Admissão: {formatDate(employee.hireDate)}</p>
                      <p className="text-sm text-gray-600">Última Alteração: {formatDate(employee.lastModification)}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confirmar Exclusão */}
      <Dialog
        open={confirmDeleteDialog.open}
        onClose={handleCloseConfirmDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirmar Exclusão"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja excluir este funcionário?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDeleteEmployee}
            color="secondary"
            autoFocus
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmployeeList;
