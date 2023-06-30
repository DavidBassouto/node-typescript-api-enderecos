/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from "express";
import oracle from "oracledb";

const app = express();
app.use(express.json());

let conexao: any = null;

//#region SERVICES
async function abrirConexao() {
  if (conexao == null) {
    console.log("TENTANDO ABRIR CONEXÃO...");
    conexao = await oracle.getConnection({
      user: "C##NODE",
      password: "node",
      connectionString: "localhost:1521/XE",
    });
    console.log("ABRIU CONEXÃO");
  }
}

async function fecharConexao() {
  if (conexao != null) {
    console.log("TENTANDO FECHAR CONEXÃO...");
    conexao.close();
    conexao = null;
    console.log("CONEXÃO ENCERRADA");
  }
}

async function gerarSequence(nomeSequence: string) {
  const sqlSequence =
    "SELECT " + nomeSequence + ".NEXTVAL AS CODIGO FROM DUAL";
  const resultSet = await conexao.execute(sqlSequence);
  const sequence = resultSet.rows[0][0];
  console.log(
    "SEQUENCE GERADA PARA " + nomeSequence + " - " + sequence,
  );
  return sequence;
}

async function commit() {
  if (conexao != null) {
    await conexao.commit();
  }
}

async function rollback() {
  if (conexao != null) {
    await conexao.rollback();
  }
}

async function verificarExistenciaUF(sigla: string, nome: string) {
  await abrirConexao();

  const sqlNome = `SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF WHERE Nome='${nome}'`;
  const sqlSigla = `SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF WHERE Sigla='${sigla}'`;

  const resultadoNome = await conexao.execute(sqlNome);
  console.log(
    "************** VERIFICANDO SE EXISTE UF COM ESTE NOME....",
  );

  if (resultadoNome.rows.length > 0) {
    console.log("***************** SQL - NOME EXISTE: ", sqlNome);
    console.log(resultadoNome.rows);

    const jsonRetorno = {
      status: 404,
      mensagem: "Nome já existe no banco de dados",
    };
    return jsonRetorno;
  }
  const resultadoSigla = await conexao.execute(sqlSigla);
  console.log(
    "************** VERIFICANDO SE EXISTE UF COM ESTA SIGLA....",
  );
  console.log(resultadoSigla.rowsAffected, " linhas afetadas Sigla");

  if (resultadoSigla.rows.length > 0) {
    console.log("***************** SQL - SIGLA EXISTE: ", sqlSigla);
    console.log(resultadoSigla.rows);
    const jsonRetorno = {
      status: 404,
      mensagem: "Sigla já existe no banco de dados.",
    };
    return jsonRetorno;
  }

  await fecharConexao();
}

async function verificarExistenciaBairro(
  codigo: number,
  nome: string,
) {
  await abrirConexao();

  const sql = `SELECT * FROM TB_BAIRRO WHERE CODIGO_MUNICIPIO=${codigo} AND NOME='${nome}'`;

  const resultado = await conexao.execute(sql);

  console.log(
    "************** VERIFICANDO SE NOME JA ESTA CADASTRADO NESTE MUNICIPIO....",
  );

  if (resultado.rows.length > 0) {
    console.log(
      "************** NOME JA ESTA CADASTRADO NESTE MUNICIPIO",
    );
    const jsonRetorno = {
      status: 404,
      mensagem: "Nome já cadastrado para este MUNICIPIO",
    };
    return jsonRetorno;
  }
  console.log("************** NOME PERMITIDO PARA ESTE MUNICIPIO");

  await fecharConexao();
}
async function verificarExistenciaMunicipio(
  codigoUF: number,
  nome: string,
) {
  await abrirConexao();

  const sql = `SELECT * FROM TB_MUNICIPIO WHERE CODIGO_UF=${codigoUF} AND NOME='${nome}'`;

  const resultado = await conexao.execute(sql);

  console.log(
    "************** VERIFICANDO SE NOME JA ESTA CADASTRADO NESTE UF....",
  );

  if (resultado.rows.length > 0) {
    console.log("************** NOME JA ESTA CADASTRADO NESTE UF");
    const jsonRetorno = {
      status: 404,
      mensagem: "Nome já cadastrado para este UF",
    };
    return jsonRetorno;
  }
  console.log("************** NOME PERMITIDO PARA ESTE UF");

  await fecharConexao();
}
async function verificarUfExiste(codigoUF: number) {
  await abrirConexao();

  const sql = `SELECT * FROM TB_UF WHERE CODIGO_UF=${codigoUF}`;

  const resultado = await conexao.execute(sql);

  console.log("************** VERIFICANDO SE UF EXISTE....");

  if (resultado.rows.length > 0) {
    console.log("************** UF EXISTE");
    await fecharConexao();
    return false;
  } else {
    console.log("************** UF NAO EXISTE");

    const jsonRetorno = {
      status: 404,
      mensagem: "UF nao encontrado",
    };
    await fecharConexao();
    return jsonRetorno;
  }
}
async function verificarMunicipioExiste(codigo: number) {
  await abrirConexao();

  const sql = `SELECT * FROM TB_MUNICIPIO WHERE CODIGO_MUNICIPIO=${codigo}`;

  const resultado = await conexao.execute(sql);

  console.log("************** VERIFICANDO SE MUNICIPIO EXISTE....");

  if (resultado.rows.length > 0) {
    console.log("************** MUNICIPIO EXISTE");
    await fecharConexao();
    return false;
  } else {
    console.log("************** MUNICIPIO NAO EXISTE");

    const jsonRetorno = {
      status: 404,
      mensagem: "MUNICIPIO nao encontrado",
    };
    await fecharConexao();
    return jsonRetorno;
  }
}

async function camposObrigatoriosUF(ufVo: any, tipo: string) {
  if (!ufVo.sigla) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Sigla é um campo obrigatorio.",
    };
    return jsonRetorno;
  }

  if (!ufVo.nome) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Nome é um campo obrigatorio.",
    };
    return jsonRetorno;
  }
  if (!ufVo.status) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Status é um campo obrigatorio.",
    };
    return jsonRetorno;
  }
  if (tipo == "put") {
    console.log("Dentro do tipo: ", tipo);
    console.log("Dentro do ufVo: ", ufVo);

    if (!ufVo.codigoUF) {
      const jsonRetorno = {
        status: 404,
        mensagem: "CodigoUF é um campo obrigatorio.",
      };
      return jsonRetorno;
    }
  }
}

async function camposObrigatoriosMunicipio(ufVo: any, tipo: string) {
  if (!ufVo.codigoUF) {
    const jsonRetorno = {
      status: 404,
      mensagem: "codigoUF é um campo obrigatorio.",
    };
    return jsonRetorno;
  }

  if (!ufVo.nome) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Nome é um campo obrigatorio.",
    };
    return jsonRetorno;
  }
  if (!ufVo.status) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Status é um campo obrigatorio.",
    };
    return jsonRetorno;
  }
  if (tipo == "put") {
    console.log("***************** Dentro do tipo: ", tipo);
    console.log("***************** Dentro do ufVo: ", ufVo);

    if (!ufVo.codigoMunicipio) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoMunicipio é um campo obrigatorio.",
      };
      return jsonRetorno;
    }
  }
}

async function camposObrigatoriosBairro(ufVo: any, tipo: string) {
  if (!ufVo.codigoMunicipio) {
    const jsonRetorno = {
      status: 404,
      mensagem: "codigoUF é um campo obrigatorio.",
    };
    return jsonRetorno;
  }

  if (!ufVo.nome) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Nome é um campo obrigatorio.",
    };
    return jsonRetorno;
  }
  if (!ufVo.status) {
    const jsonRetorno = {
      status: 404,
      mensagem: "Status é um campo obrigatorio.",
    };
    return jsonRetorno;
  }
  if (tipo == "put") {
    console.log("***************** Dentro do tipo: ", tipo);
    console.log("***************** Dentro do ufVo: ", ufVo);

    if (!ufVo.codigoBairro) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoMunicipio é um campo obrigatorio.",
      };
      return jsonRetorno;
    }
  }
}
//#endregion

//
//
//

//#region TABELA_UF

//#region GET UF

app.get("/uf", function (request, response) {
  return consultarUF(request, response);
});

async function consultarUF(request: Request, response: Response) {
  try {
    const listaUFs = [];
    let sql = "SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF";
    const queryParams = [];
    const queryKeys = ["codigoUF", "sigla", "nome", "status"];

    for (let key of queryKeys) {
      if (request.query[key]) {
        if (key == "codigoUF") {
          key = "codigo_uf";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query["codigoUF"]}'`,
          );
        } else {
          queryParams.push(
            `${key.toUpperCase()}= '${request.query[key]}'`,
          );
        }
      }
    }

    if (queryParams.length > 0) {
      sql += ` WHERE ${queryParams.join(" AND ")}`;
    }

    console.log("*****************SQL: ", sql);
    await abrirConexao();

    const resultado = await conexao.execute(sql);
    let numeroLinha = 0;
    let numeroColuna = 0;
    const quantidadeResultados = resultado.rows.length;

    while (numeroLinha < quantidadeResultados) {
      const ufVo = {
        codigoUF: resultado.rows[numeroLinha][numeroColuna++],
        sigla: resultado.rows[numeroLinha][numeroColuna++],
        nome: resultado.rows[numeroLinha][numeroColuna++],
        status: resultado.rows[numeroLinha][numeroColuna++],
      };
      listaUFs.push(ufVo);
      numeroLinha++;
      numeroColuna = 0;
    }

    console.log(resultado.rows);

    if (
      request.query.codigoUF ||
      request.query.nome ||
      request.query.sigla
    ) {
      if (listaUFs.length == 0) {
        return response.status(200).json(listaUFs);
      } else {
        return response.status(200).json(listaUFs[0]);
      }
    }

    response.status(200).json(listaUFs);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível obter Municipios.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}
//#endregion

//#region  POST UF
app.post("/uf", async (request, response) => {
  return await adicionarUF(request, response);
});

async function adicionarUF(request: Request, response: Response) {
  try {
    //CAPTURAR OS DADOS QUE VIERAM DA REQUISIÇÃO (FORMATO JSON)
    const ufVo = request.body;

    //verificar campos obrigatorios
    const camposObrigatorios = await camposObrigatoriosUF(
      ufVo,
      "post",
    );
    if (camposObrigatorios) {
      return response.status(404).json(camposObrigatorios);
    }

    //VERIFICAR SE SIGLA TEM 2 CARACTERES
    if (ufVo.sigla.length != 2) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Sigla deve conter 2 caracteres.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE SIGLA POSSUI NUMEROS
    const regex = /^[A-Za-z\s]+$/;

    if (!regex.test(ufVo.sigla)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Sigla deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE NOME POSSUI NUMEROS

    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await verificarExistenciaUF(
      ufVo.sigla,
      ufVo.nome,
    );
    if (itemDuplicado) {
      return response.status(400).json(itemDuplicado);
    }

    //ABRIR A CONEXÃO
    await abrirConexao();
    //GERAR UM CÓDIGO POR MEIO DE UMA SEQUENCE
    ufVo.codigoUF = await gerarSequence("SEQUENCE_UF");
    //GERAR O MEU SQL PARA MANDAR GRAVAR NO BANCO DE DADOS
    const sql =
      "INSERT INTO TB_UF (CODIGO_UF, SIGLA, NOME, STATUS) VALUES (:codigoUF, :sigla, :nome, :status)";
    //MANDAR EXECUTAR O MEU SQL PARA GRAVAR
    const resultSet = await conexao.execute(sql, ufVo);
    //VALIDAR SE OS REGISTROS FORAM INSERIDOS OU NÃO
    console.log(
      "FORAM INSERIDOS " +
        resultSet.rowsAffected +
        " REGISTROS NO BANCO DE DADOS",
    );
    //COMMITAR - MANDAR O BANCO GRAVAR REALMENTE O QUE O SQL MANDOU
    await commit();
    await consultarUF(request, response);
  } catch (err) {
    console.log(err);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível incluir UF no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    //FECHAR A CONEXAO
    await fecharConexao();
  }
}
//#endregion POST UF

//#region PUT UF

app.put("/uf", async (request, response) => {
  return await alterarUF(request, response);
});

async function alterarUF(request: Request, response: Response) {
  try {
    const ufVo = request.body;

    const camposObrigatorios = await camposObrigatoriosUF(
      ufVo,
      "put",
    );
    if (camposObrigatorios) {
      return response.status(404).json(camposObrigatorios);
    }
    //VERIFICAR SE SIGLA TEM 2 CARACTERES
    if (ufVo.sigla.length != 2) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Sigla deve conter 2 caracteres.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE SIGLA POSSUI NUMEROS
    const regex = /^[A-Za-z\s]+$/;

    if (!regex.test(ufVo.sigla)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Sigla deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE NOME POSSUI NUMEROS
    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //DESCONSIDERAR EXISTENCIA DE CAMPOS DO PROPRIO OBJETO
    await abrirConexao();
    const sqlPadrao =
      "UPDATE TB_UF SET NOME= :nome, SIGLA= :sigla, STATUS= :status WHERE CODIGO_UF= :codigoUF ";
    await conexao.execute(sqlPadrao, [
      "xx",
      "xx",
      "1",
      ufVo.codigoUF,
    ]);
    console.log(sqlPadrao);

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await verificarExistenciaUF(
      ufVo.sigla,
      ufVo.nome,
    );
    if (itemDuplicado) {
      return response.status(400).json(itemDuplicado);
    }

    await abrirConexao();
    const sql =
      "UPDATE TB_UF SET NOME= :nome, SIGLA= :sigla, STATUS= :status WHERE CODIGO_UF= :codigoUF ";
    const resultSet = await conexao.execute(sql, ufVo);
    console.log(sql);
    //row = 0 noa editou nada
    if (resultSet.rowsAffected == 0) {
      await rollback();
      const jsonRetorno = {
        status: 404,
        mensagem: "Nenhum item encontrado com o codigoUF fornecido",
      };
      return response.status(404).json(jsonRetorno);
    }
    console.log(
      "Foram alterados" +
        resultSet.rowsAffected +
        "registros no banco de dados",
    );
    await commit();
    await consultarUF(request, response);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível alterar UF no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}

//#endregion

//#region DELETE UF
app.delete("/uf/:id", async (request, response) => {
  return await deletarUF(request, response);
});

async function deletarUF(request: Request, response: Response) {
  try {
    const codigoUf = request.params.id;
    const regexNumero = /^\d+$/;
    if (!regexNumero.test(codigoUf)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Parâmetro deve conter valor numérico",
      };
      return response.status(404).json(jsonRetorno);
    }

    await abrirConexao();
    const sql = `DELETE FROM TB_UF WHERE CODIGO_UF= ${codigoUf}`;
    const sqlMunicipio = `DELETE FROM TB_MUNICIPIO WHERE CODIGO_UF= ${codigoUf}`;
    await conexao.execute(sqlMunicipio);
    const resultSet = await conexao.execute(sql);
    //row = 0 noa editou nada
    if (resultSet.rowsAffected == 0) {
      await rollback();
      const jsonRetorno = {
        status: 404,
        mensagem: "Nenhum item encontrado com o codigoUF fornecido",
      };
      return response.status(404).json(jsonRetorno);
    }
    console.log(
      "Foram alterados" +
        resultSet.rowsAffected +
        "registros no banco de dados",
    );
    await commit();
    await consultarUF(request, response);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível excluir UF no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}
//#endregion

//#endregion

//
//
//

//#region TABELA_MUNICIPIO

//#region GET MUNICIPIO

app.get("/municipio", function (request, response) {
  return consultarMunicipio(request, response);
});

async function consultarMunicipio(
  request: Request,
  response: Response,
) {
  try {
    const listaMunicipio = [];
    await abrirConexao();
    let sql = "SELECT * FROM TB_MUNICIPIO ";
    const queryParams: any = [];
    const queryKeys = [
      "codigoUF",
      "codigoMunicipio",
      "nome",
      "status",
    ];

    queryKeys.forEach(key => {
      if (request.query[key]) {
        if (key == "codigoUF") {
          key = "codigo_uf";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query.codigoUF}'`,
          );
        }
        if (key == "codigoMunicipio") {
          key = "codigo_municipio";
          queryParams.push(
            `${key.toUpperCase()}= '${
              request.query.codigoMunicipio
            }'`,
          );
        }
        if (key == "status") {
          key = "status";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query.status}'`,
          );
        }
        if (key == "nome") {
          key = "nome";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query.nome}'`,
          );
        }
      }
    });

    if (queryParams.length > 0) {
      sql += ` WHERE ${queryParams.join(" AND ")}`;
    }

    console.log("*****************SQL: ", sql);
    await abrirConexao();
    const resultado = await conexao.execute(sql);
    let numeroLinha = 0;
    let numeroColuna = 0;
    const quantidadeResultados = resultado.rows.length;

    while (numeroLinha < quantidadeResultados) {
      const ufVo = {
        codigoMunicipio: resultado.rows[numeroLinha][numeroColuna++],
        codigoUF: resultado.rows[numeroLinha][numeroColuna++],
        nome: resultado.rows[numeroLinha][numeroColuna++],
        status: resultado.rows[numeroLinha][numeroColuna++],
      };
      listaMunicipio.push(ufVo);
      numeroLinha++;
      numeroColuna = 0;
    }

    console.log(resultado.rows);
    await fecharConexao();

    if (request.query.codigoMunicipio) {
      if (listaMunicipio.length == 0) {
        return response.status(200).json(listaMunicipio);
      } else {
        return response.status(200).json(listaMunicipio[0]);
      }
    }

    return response.status(200).json(listaMunicipio);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível obter Municipios.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}
//#endregion

//#region  POST MUNICIPIO
app.post("/municipio", async (request, response) => {
  return await adicionarMunicipio(request, response);
});

async function adicionarMunicipio(
  request: Request,
  response: Response,
) {
  try {
    //CAPTURAR OS DADOS QUE VIERAM DA REQUISIÇÃO (FORMATO JSON)
    const ufVo = request.body;

    // verificar campos obrigatorios Municipio
    const camposObrigatorios = await camposObrigatoriosMunicipio(
      ufVo,
      "post",
    );
    if (camposObrigatorios) {
      return response.status(404).json(camposObrigatorios);
    }

    //VERIFICAR SE CODIGO UFsy
    const regexNumero = /^\d+$/;
    if (!regexNumero.test(ufVo.codigoUF)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoUF deve conter apenas números.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE NOME POSSUI NUMEROS
    const regex = /^[\p{L}A-Za-z\s]+$/u;

    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //VERIFICAR SE CODIGO_UF EXISTE
    const ufExiste = await verificarUfExiste(ufVo.codigoUF);
    if (ufExiste) {
      return response.status(400).json(ufExiste);
    }

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await verificarExistenciaMunicipio(
      ufVo.codigoUF,
      ufVo.nome,
    );
    if (itemDuplicado) {
      return response.status(400).json(itemDuplicado);
    }

    //ABRIR A CONEXÃO
    await abrirConexao();
    //GERAR UM CÓDIGO POR MEIO DE UMA SEQUENCE
    ufVo.codigoMunicipio = await gerarSequence("SEQUENCE_MUNICIPIO");
    //GERAR O MEU SQL PARA MANDAR GRAVAR NO BANCO DE DADOS
    const sql =
      "INSERT INTO TB_MUNICIPIO (CODIGO_MUNICIPIO, CODIGO_UF, NOME, STATUS) VALUES (:codigoMunicipio, :codigoUF, :nome, :status)";
    //MANDAR EXECUTAR O MEU SQL PARA GRAVAR
    const resultSet = await conexao.execute(sql, ufVo);
    //VALIDAR SE OS REGISTROS FORAM INSERIDOS OU NÃO
    console.log(
      "FORAM INSERIDOS " +
        resultSet.rowsAffected +
        " REGISTROS NO BANCO DE DADOS",
    );
    //COMMITAR - MANDAR O BANCO GRAVAR REALMENTE O QUE O SQL MANDOU
    await commit();
    await consultarMunicipio(request, response);
  } catch (err) {
    console.log(err);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem:
        "Não foi possível incluir Municipio no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    //FECHAR A CONEXAO
    await fecharConexao();
  }
}
//#endregion POST MUNICIPIO

//#region PUT MUNICIPIO

app.put("/municipio", async (request, response) => {
  return await alterarMunicipio(request, response);
});

async function alterarMunicipio(
  request: Request,
  response: Response,
) {
  try {
    const ufVo = request.body;

    const camposObrigatorios = await camposObrigatoriosMunicipio(
      ufVo,
      "put",
    );
    if (camposObrigatorios) {
      return response.status(404).json(camposObrigatorios);
    }

    //VERIFICAR SE CODIGO UFsy
    const regexNumero = /^\d+$/;
    if (!regexNumero.test(ufVo.codigoUF)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoUF deve conter apenas números.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE CODIGO MUNICIPIOsy
    if (!regexNumero.test(ufVo.codigoMunicipio)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoMunicipio deve conter apenas números.",
      };
      return response.status(404).json(jsonRetorno);
    }

    const regex = /^[\p{L}A-Za-z\s]+$/u;

    //VERIFICAR SE NOME POSSUI NUMEROS
    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //DESCONSIDERAR EXISTENCIA DE CAMPOS DO PROPRIO OBJETO
    await abrirConexao();
    const sqlPadrao = `UPDATE TB_MUNICIPIO SET NOME= 'nome', CODIGO_UF= ${ufVo.codigoUF}, STATUS= '1' WHERE CODIGO_MUNICIPIO= ${ufVo.codigoMunicipio}`;
    await conexao.execute(sqlPadrao);
    console.log(sqlPadrao);
    await commit();

    //VERIFICAR SE CODIGO_UF EXISTE
    const ufExiste = await verificarUfExiste(ufVo.codigoUF);
    if (ufExiste) {
      return response.status(400).json(ufExiste);
    }

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await verificarExistenciaMunicipio(
      ufVo.codigoUF,
      ufVo.nome,
    );
    if (itemDuplicado) {
      return response.status(400).json(itemDuplicado);
    }

    await abrirConexao();
    const sql =
      "UPDATE TB_MUNICIPIO SET NOME= :nome, CODIGO_UF= :codigoUF, STATUS= :status WHERE CODIGO_MUNICIPIO= :codigoMunicipio";
    const resultSet = await conexao.execute(sql, ufVo);
    console.log(sql);
    //row = 0 noa editou nada
    if (resultSet.rowsAffected == 0) {
      await rollback();
      const jsonRetorno = {
        status: 404,
        mensagem:
          "Nenhum item encontrado com o codigoMunicipio fornecido",
      };
      return response.status(404).json(jsonRetorno);
    }
    console.log(
      "Foram alterados" +
        resultSet.rowsAffected +
        "registros no banco de dados",
    );
    await commit();
    await consultarMunicipio(request, response);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem:
        "Não foi possível alterar Municipio no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}

//#endregion

//#region DELETE MUNICIPIO
app.delete("/municipio/:id", async (request, response) => {
  return await deletarMunicipio(request, response);
});

async function deletarMunicipio(
  request: Request,
  response: Response,
) {
  try {
    const codigoMunicipio = request.params.id;

    const regexNumero = /^\d+$/;
    if (!regexNumero.test(codigoMunicipio)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Parâmetro deve conter valor numérico",
      };
      return response.status(404).json(jsonRetorno);
    }

    await abrirConexao();
    const sql = `DELETE FROM TB_MUNICIPIO WHERE CODIGO_MUNICIPIO= ${codigoMunicipio} `;
    const resultSet = await conexao.execute(sql);
    //row = 0 noa editou nada
    if (resultSet.rowsAffected == 0) {
      await rollback();
      const jsonRetorno = {
        status: 404,
        mensagem:
          "Nenhum item encontrado com o codigoMunicipio fornecido",
      };
      return response.status(404).json(jsonRetorno);
    }
    console.log(
      "Foram alterados" +
        resultSet.rowsAffected +
        "registros no banco de dados",
    );
    await commit();
    await consultarMunicipio(request, response);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem:
        "Não foi possível excluir Municipio no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}

//#endregion

//#endregion

//
//
//

//#region TABELA_BAIRRO

//#region GET BAIRRO

app.get("/bairro", function (request, response) {
  return consultarBairro(request, response);
});

async function consultarBairro(request: Request, response: Response) {
  try {
    const listabairro = [];
    await abrirConexao();
    let sql = "SELECT * FROM TB_BAIRRO ";
    const queryParams: any = [];
    const queryKeys = [
      "codigoBairro",
      "codigoMunicipio",
      "nome",
      "status",
    ];

    queryKeys.forEach(key => {
      if (request.query[key]) {
        if (key == "codigoBairro") {
          key = "codigo_bairro";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query.codigoBairro}'`,
          );
        }
        if (key == "codigoMunicipio") {
          key = "codigo_municipio";
          queryParams.push(
            `${key.toUpperCase()}= '${
              request.query.codigoMunicipio
            }'`,
          );
        }
        if (key == "status") {
          key = "status";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query.status}'`,
          );
        }
        if (key == "nome") {
          key = "nome";
          queryParams.push(
            `${key.toUpperCase()}= '${request.query.nome}'`,
          );
        }
      }
    });

    if (queryParams.length > 0) {
      sql += ` WHERE ${queryParams.join(" AND ")}`;
    }

    console.log("*****************SQL: ", sql);
    await abrirConexao();
    const resultado = await conexao.execute(sql);
    let numeroLinha = 0;
    let numeroColuna = 0;
    const quantidadeResultados = resultado.rows.length;

    while (numeroLinha < quantidadeResultados) {
      const ufVo = {
        codigoBairro: resultado.rows[numeroLinha][numeroColuna++],
        codigoMunicipio: resultado.rows[numeroLinha][numeroColuna++],
        nome: resultado.rows[numeroLinha][numeroColuna++],
        status: resultado.rows[numeroLinha][numeroColuna++],
      };
      listabairro.push(ufVo);
      numeroLinha++;
      numeroColuna = 0;
    }

    console.log(resultado.rows);
    await fecharConexao();

    if (request.query.codigoBairro) {
      if (listabairro.length == 0) {
        return response.status(200).json(listabairro);
      } else {
        return response.status(200).json(listabairro[0]);
      }
    }

    return response.status(200).json(listabairro);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível obter Municipios.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}
//#endregion

//#region  POST BAIRRO
app.post("/bairro", async (request, response) => {
  return await adicionarBairro(request, response);
});

async function adicionarBairro(request: Request, response: Response) {
  try {
    //CAPTURAR OS DADOS QUE VIERAM DA REQUISIÇÃO (FORMATO JSON)
    const ufVo = request.body;

    // verificar campos obrigatorios Municipio
    const camposObrigatorios = await camposObrigatoriosBairro(
      ufVo,
      "post",
    );
    if (camposObrigatorios) {
      return response.status(404).json(camposObrigatorios);
    }

    //VERIFICAR SE CODIGO Municipiosy
    const regexNumero = /^\d+$/;
    if (!regexNumero.test(ufVo.codigoMunicipio)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoMunicipio deve conter apenas números.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE NOME POSSUI NUMEROS
    const regex = /^[\p{L}A-Za-z\s]+$/u;

    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //VERIFICAR SE CODIGO_Municipio EXISTE
    const municipioExiste = await verificarMunicipioExiste(
      ufVo.codigoMunicipio,
    );
    if (municipioExiste) {
      return response.status(400).json(municipioExiste);
    }

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await verificarExistenciaBairro(
      ufVo.codigoMunicipio,
      ufVo.nome,
    );
    if (itemDuplicado) {
      return response.status(400).json(itemDuplicado);
    }

    //ABRIR A CONEXÃO
    await abrirConexao();
    //GERAR UM CÓDIGO POR MEIO DE UMA SEQUENCE
    ufVo.codigoBairro = await gerarSequence("SEQUENCE_BAIRRO");
    //GERAR O MEU SQL PARA MANDAR GRAVAR NO BANCO DE DADOS
    const sql =
      "INSERT INTO TB_bairro (CODIGO_BAIRRO, CODIGO_MUNICIPIO, NOME, STATUS) VALUES (:codigoBairro, :codigoMunicipio, :nome, :status)";
    //MANDAR EXECUTAR O MEU SQL PARA GRAVAR
    const resultSet = await conexao.execute(sql, ufVo);
    //VALIDAR SE OS REGISTROS FORAM INSERIDOS OU NÃO
    console.log(
      "FORAM INSERIDOS " +
        resultSet.rowsAffected +
        " REGISTROS NO BANCO DE DADOS",
    );
    //COMMITAR - MANDAR O BANCO GRAVAR REALMENTE O QUE O SQL MANDOU
    await commit();
    await consultarBairro(request, response);
  } catch (err) {
    console.log(err);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível incluir Bairro no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    //FECHAR A CONEXAO
    await fecharConexao();
  }
}
//#endregion POST MUNICIPIO

//#region PUT BAIRRO

app.put("/bairro", async (request, response) => {
  return await alterarBairro(request, response);
});

async function alterarBairro(request: Request, response: Response) {
  try {
    const ufVo = request.body;

    const camposObrigatorios = await camposObrigatoriosBairro(
      ufVo,
      "put",
    );
    if (camposObrigatorios) {
      return response.status(404).json(camposObrigatorios);
    }

    //VERIFICAR SE CODIGO É NUMERICOsy
    const regexNumero = /^\d+$/;
    if (!regexNumero.test(ufVo.codigoBairro)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoBairro deve conter apenas números.",
      };
      return response.status(404).json(jsonRetorno);
    }

    if (!regexNumero.test(ufVo.codigoMunicipio)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "codigoMunicipio deve conter apenas números.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR SE SIGLA POSSUI NUMEROS
    const regex = /^[\p{L}A-Za-z\s]+$/u;

    //VERIFICAR SE NOME POSSUI NUMEROS
    if (!regex.test(ufVo.nome)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Nome deve conter apenas letras.",
      };
      return response.status(404).json(jsonRetorno);
    }

    //VERIFICAR VALOR DE STATUS
    if (!(ufVo.status == 1 || ufVo.status == 2)) {
      const jsonRetorno = {
        status: 400,
        mensagem: "Valor inválido para o campo Status.",
      };
      return response.status(400).json(jsonRetorno);
    }

    //DESCONSIDERAR EXISTENCIA DE CAMPOS DO PROPRIO OBJETO
    await abrirConexao();
    const sqlPadrao = `UPDATE TB_BAIRRO SET NOME= 'nome', CODIGO_MUNICIPIO= ${ufVo.codigoMunicipio}, STATUS= 1 WHERE CODIGO_BAIRRO= ${ufVo.codigoBairro}`;
    await conexao.execute(sqlPadrao);
    console.log(sqlPadrao);
    await commit();

    //VERIFICAR SE MUNICIPIO  EXISTE
    const municipioExiste = await verificarMunicipioExiste(
      ufVo.codigoMunicipio,
    );
    if (municipioExiste) {
      return response.status(400).json(municipioExiste);
    }

    //VERIFICAR SE EXISTE REGISTRO COM MESMO VALOR NO BANCO
    const itemDuplicado = await verificarExistenciaBairro(
      ufVo.codigoMunicipio,
      ufVo.nome,
    );
    if (itemDuplicado) {
      return response.status(400).json(itemDuplicado);
    }

    await abrirConexao();
    const sql =
      "UPDATE TB_BAIRRO SET NOME= :nome, CODIGO_MUNICIPIO= :codigoMunicipio, STATUS= :status WHERE CODIGO_BAIRRO= :codigoBairro";
    const resultSet = await conexao.execute(sql, ufVo);
    console.log(sql);
    //row = 0 noa editou nada
    if (resultSet.rowsAffected == 0) {
      await rollback();
      const jsonRetorno = {
        status: 404,
        mensagem:
          "Nenhum item encontrado com o codigoBairro fornecido",
      };
      return response.status(404).json(jsonRetorno);
    }
    console.log(
      "Foram alterados" +
        resultSet.rowsAffected +
        "registros no banco de dados",
    );
    await commit();
    await consultarBairro(request, response);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível alterar Bairro no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}

//#endregion

//#region DELETE BAIRRO
app.delete("/bairro/:id", async (request, response) => {
  return await deletarBairro(request, response);
});

async function deletarBairro(request: Request, response: Response) {
  try {
    const codigoBairro = request.params.id;

    const regexNumero = /^\d+$/;
    if (!regexNumero.test(codigoBairro)) {
      const jsonRetorno = {
        status: 404,
        mensagem: "Parâmetro deve conter valor numérico",
      };
      return response.status(404).json(jsonRetorno);
    }

    await abrirConexao();
    const sql = `DELETE FROM TB_BAIRRO WHERE CODIGO_BAIRRO= ${codigoBairro} `;
    const resultSet = await conexao.execute(sql);
    //row = 0 noa editou nada
    if (resultSet.rowsAffected == 0) {
      await rollback();
      const jsonRetorno = {
        status: 404,
        mensagem:
          "Nenhum item encontrado com o codigoBairro fornecido",
      };
      return response.status(404).json(jsonRetorno);
    }
    console.log(
      "Foram alterados" +
        resultSet.rowsAffected +
        "registros no banco de dados",
    );
    await commit();
    await consultarBairro(request, response);
  } catch (error) {
    console.log(error);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível excluir BAIRRO no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    await fecharConexao();
  }
}

//#endregion

//#endregion

app.listen(3333, () => {
  console.log("O SERVIDOR FOI INICIADO COM SUCESSO..");
});
