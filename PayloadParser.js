function parseUplink(device, payload) {
    // Obtén el contenido del payload como un array JSON
    var parsedArray = JSON.parse(payload.asString());

    // Función para validar y convertir valores a float de manera segura
    function safeParseFloat(value) {
        if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
            env.log(`Valor inválido para parsear a float: ${value}`);
            return null; // Retorna null para valores inválidos
        }
        const parsedValue = parseFloat(value);
        return parsedValue < 0 ? 0 : parsedValue; // Si el valor es negativo, retornamos 0
    }

    // Mapeo de alias a endpoints y métodos
    const aliasToEndpointMap = {
        "Terra 31-1#17 % Volumetrique": { endpoint: "1", method: "updateGenericSensorStatus" },
        "Terra 31-1#17 ": { endpoint: "1", method: "updateGenericSensorStatus" },
        "Terra 31-2#17 % Volumetrique": { endpoint: "2", method: "updateGenericSensorStatus" },
        "Terra 31-2#17 ": { endpoint: "2", method: "updateGenericSensorStatus" },
        "Dendro tronco#89 Micromtres": { endpoint: "17", method: "updateGenericSensorStatus" },
        "Dendro tronco#89 Micromilimetres": { endpoint: "17", method: "updateGenericSensorStatus" },
        "Dendro tronco#89 mm": { endpoint: "17", method: "updateGenericSensorStatus" },
        "Compteur#37 lt": { endpoint: "13", method: "updateVolumeSensorStatus" },
        "Pulse#37 lt": { endpoint: "13", method: "updateVolumeSensorStatus" },
        "Compteur#37 Pulses": { endpoint: "13", method: "updateVolumeSensorStatus" },
        "Terra 34-1#17 % Volumetrique": { endpoint: "4", method: "updateGenericSensorStatus" },
        "Terra 34-1#17 ": { endpoint: "4", method: "updateGenericSensorStatus" },
        "Terra 34-1#6 EC Bulk": { endpoint: "5", method: "updateGenericSensorStatus" },
        "Terra 34-1#6 ": { endpoint: "5", method: "updateGenericSensorStatus" },
        "Terra 34-1#31 Temperature C": { endpoint: "6", method: "updateTemperatureSensorStatus" },
        "Terra 34-1#31 ": { endpoint: "6", method: "updateTemperatureSensorStatus" },
        "Terra 34-2#17 % Volumetrique": { endpoint: "7", method: "updateGenericSensorStatus" },
        "Terra 34-2#17 ": { endpoint: "7", method: "updateGenericSensorStatus" },
        "Terra 34-2#6 EC Bulk": { endpoint: "8", method: "updateGenericSensorStatus" },
        "Terra 34-2#6 ": { endpoint: "8", method: "updateGenericSensorStatus" },
        "Terra 34-2#31 Temperature C": { endpoint: "9", method: "updateTemperatureSensorStatus" },
        "Terra 34-2#31 ": { endpoint: "9", method: "updateTemperatureSensorStatus" },
        "TEMP SHT#31 ": { endpoint: "15", method: "updateTemperatureSensorStatus" },
        "TEMP#31 ": { endpoint: "15", method: "updateTemperatureSensorStatus" },
        "SHT#31": { endpoint: "15", method: "updateTemperatureSensorStatus" },
        "HUMIDITY SHT#35 ": { endpoint: "16", method: "updateHumiditySensorStatus" },
        "HUM#35 ": { endpoint: "16", method: "updateHumiditySensorStatus" },
        "SHT#35": { endpoint: "16", method: "updateHumiditySensorStatus" },
        "SOLAR ": { endpoint: "49", method: "updateVoltageSensorStatus" },
        "VSOLAR ": { endpoint: "49", method: "updateVoltageSensorStatus" },
        "VSOLAR": { endpoint: "49", method: "updateVoltageSensorStatus" },
        "BATT ": { endpoint: "50", method: "updateVoltageSensorStatus" },
        "BATT": { endpoint: "50", method: "updateVoltageSensorStatus" },
        "BATTV ": { endpoint: "50", method: "updateVoltageSensorStatus" },
        "BATT CH Current": { endpoint: "51", method: "updateCurrentSensorStatus" },
        "Batt Ch Current ": { endpoint: "51", method: "updateCurrentSensorStatus" },
        "BATT CH ": { endpoint: "51", method: "updateCurrentSensorStatus" },
        // Agregar más alias aquí
    };

    // Verificamos si el payload es un array y si tiene al menos un elemento
    if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        parsedArray.forEach((parsed, index) => {
            env.log(`Procesando elemento ${index} del array...`);

            // Extraer y convertir el timestamp de 'createdAt' a un formato de fecha UTC
            if (parsed.createdAt) {
                var createdAtMs = parsed.createdAt;
                var utcDateTime = new Date(createdAtMs);
            } else {
                env.log("El campo 'createdAt' no está presente en el objeto JSON.");
                return;
            }

            // Validar existencia de 'sensor' y 'aliass'
            if (parsed.sensor && Array.isArray(parsed.sensor) && parsed.aliass && Array.isArray(parsed.aliass)) {
                const unprocessedAliases = [];

                parsed.aliass.forEach((alias, aliasIndex) => {
                    if (aliasToEndpointMap[alias]) {
                        const { endpoint, method } = aliasToEndpointMap[alias];
                        const value = safeParseFloat(parsed.sensor[aliasIndex]);

                        if (value !== null) {
                            device.endpoints.byAddress(endpoint)[method](value.toFixed(2), utcDateTime);
                        } else {
                            env.log(`Valor no válido para el alias '${alias}' en índice ${aliasIndex}: ${parsed.sensor[aliasIndex]}`);
                        }
                    } else {
                        unprocessedAliases.push(alias);
                    }
                });

                if (unprocessedAliases.length > 0) {
                    env.log("Aliass no procesados: " + unprocessedAliases.join(", "));
                }


                // Cálculo de pulse
                var pulseOriginal = parseFloat(parsed.sensor[3]);
                env.log("Pulse Original, ",pulseOriginal)
                var z = parseFloat(device.endpoints.byAddress("149").getCurrentState().value) || 0;;
                // env.log('Z ', z);
                var y = parseFloat(device.endpoints.byAddress("150").getCurrentState().value) || 0;;
                // env.log('Y ', y);
                var x = parseFloat(device.endpoints.byAddress("151").getCurrentState().value) || 0;;
                // env.log('X ', x);
                if (z === 0 || y === 0 || x === 0) {
                    //  env.log('Error: división por cero');
                    var pulse = pulseOriginal;
                    device.endpoints.byAddress("52").updateGenericSensorStatus(pulse, utcDateTime);
                    env.log('Pulse ', pulse);

                } else {
                    var pulse = ((pulseOriginal * z) / (x * y));
                    pulse = parseFloat(pulse.toFixed(2));
                    device.endpoints.byAddress("52").updateGenericSensorStatus(pulse, utcDateTime);
                    env.log('Pulse ', pulse);
                }

                // Calcular el Pulse Acumulado (suma con reseteo)
                var pulseAccumulated = device.endpoints.byAddress("53").getCurrentState().value;
                if (pulse === 0) {
                    pulseAccumulated = 0; // Resetear si el pulse es 0
                } else {
                    pulseAccumulated += pulse; // Sumar al acumulado
                }


                device.endpoints.byAddress("53").updateGenericSensorStatus(pulseAccumulated, utcDateTime);

                // Cálculo del tiempo entre muestras
                var muestreo = null;
                if (device.endpoints.byAddress("152").getCurrentState()) {
                    muestreo = device.endpoints.byAddress("152").getCurrentState().value;
                    if (muestreo) {
                        // Sumar 1 hora al muestreo
                        muestreo += 0; // 3600 segundos equivalen a 1 hora
                        //env.log('Muestreo ajustado: ', muestreo);
                        
                        if (muestreo > 0 && muestreo > 4070908800) { // 2099-01-01
                            // env.log('Descartando muestreo inválido');
                            muestreo = null;
                        }
                    }


                    else {
                        //env.log('Muestreo: null');
                    }

                    // Calcular Tiempo de hora de riego 
                    if (pulse > 0) {
                        accumulatorStatus = 0; // Si el pulse es mayor a 0, acumulador es 0
                    } else {
                        accumulatorStatus = 1; // Si el pulse es 0 o menor, acumulador es 1
                    }

                    //env.log('Acumulador status', accumulatorStatus);

                    // Actualizar el estado del acumulador en el endpoint Address 153
                    device.endpoints.byAddress("153").updateGenericSensorStatus(accumulatorStatus, utcDateTime);

                }


                // Cálculo número de riegos

                var numeroRiegoDiarios = device.endpoints.byAddress("63").getCurrentState().value;

                if (pulse > 0) {
                    numeroRiegoDiarios += 1;  // Sumar 1 si el pulse es mayor a 0
                    device.endpoints.byAddress("157").updateGenericSensorStatus(numeroRiegoDiarios, utcDateTime);
                    // env.log("Número de Riego Diario: ", numeroRiegoDiarios);
                }

                else {
                    //env.log('Muestreo: NO HAY VALOR');
                }

                // Verificamos que el muestreo sea válido
                if (muestreo) {
                    // La variable "muestreo" está en segundos, porque es de tipo
                    // DateTime y la plataforma guarda ese tipo de variables en segundos.
                    var diferenciaSegundos = (utcDateTime.getTime() / 1000) - muestreo;
                    var diferenciaMinutos = diferenciaSegundos / 60;
                    var diferenciaHoras = diferenciaSegundos / 3600;
                    // env.log('Diferencia en segundos: ', diferenciaSegundos);
                    // env.log('Diferencia en minutos: ', diferenciaMinutos);
                    // env.log('Diferencia en horas: ', diferenciaHoras);

                    // Guardamos la diferencia en horas en el endpoint 55
                    device.endpoints.byAddress("55").updateGenericSensorStatus(diferenciaHoras.toFixed(2), utcDateTime);

                    // Guardamos la diferencia en minutos en el endpoint 56
                    device.endpoints.byAddress("56").updateGenericSensorStatus(diferenciaMinutos.toFixed(2), utcDateTime);

                }
                // Guardamos la fecha/hora de esta muestra en el endpoint 152.
                // Importante: como es un endpoint de tipo date/time, el valor
                // se guarda en segundos
                device.endpoints.byAddress("152").updateGenericSensorStatus(utcDateTime.getTime() / 1000, utcDateTime);

                // Calcular Salinidad Pore Ec
                var hum = parseFloat(parsed.sensor[4]);  // Humedad del suelo (Address 4)
                var sal = parseFloat(parsed.sensor[5]);  // Salinidad BULK (Address 5)
                var temp = parseFloat(parsed.sensor[6]);  // Temperatura del suelo (Address 6)
                var salinidadPoreEC = ((80.3 - 0.37 * (temp - 20))) * sal /
                    (Math.pow((0.000000002887 * Math.pow((0.6946 + (hum / 100)) / 0.0003879, 3) -
                        0.0000208 * Math.pow((0.6946 + (hum / 100)) / 0.0003879, 2) +
                        0.05276 * ((0.6946 + (hum / 100)) / 0.0003879) - 43.39), 2) - 4.10);
                var salinidadPoreECround = (salinidadPoreEC.toFixed(2));
                device.endpoints.byAddress("140").updateGenericSensorStatus(salinidadPoreECround, utcDateTime);

                /*     // Cálculo de pulse drenaje
                     var pulseOriginalDrenaje = parseFloat(parsed.sensor[3]); //Desconocido
                     env.log(pulseOriginalDrenaje)
                     var zd = parseFloat(device.endpoints.byAddress("154").getCurrentState().value);
                     // env.log('Z Drenaje ', zd);
                     var yd = parseFloat(device.endpoints.byAddress("155").getCurrentState().value);
                     // env.log('Y Drenaje ', yd);
                     var xd = parseFloat(device.endpoints.byAddress("156").getCurrentState().value);
                     // env.log('X Drenaje ', xd);
                     if (zd === 0 || yd === 0 || xd === 0) {
                        env.log('Error: división por cero');
                         device.endpoints.byAddress("59").updateGenericSensorStatus(0, utcDateTime);
                     } else {
                         var pulseDrenaje = ((pulseOriginalDrenaje * zd) / (xd * yd));
                         pulseDrenaje = parseFloat(pulseDrenaje.toFixed(2));
                         device.endpoints.byAddress("59").updateGenericSensorStatus(pulseDrenaje, utcDateTime);
                          //   env.log('Pulse Drenaje ', pulseDrenaje);
                     }
                   
                     // Calcular el Pulse Acumulado Drenaje (suma con reseteo)
                     var pulseAccumulatedDrenaje = device.endpoints.byAddress("60").getCurrentState().value;
                     if (pulseDrenaje === 0) {
                         pulseAccumulatedDrenaje = 0; // Resetear si el pulse es 0
                     } else {
                         pulseAccumulatedDrenaje += pulseDrenaje; // Sumar al acumulado
                      //   env.log('Pulse Acumulado Drenaje ', pulseAccumulatedDrenaje);
               
                     }
     */


                //Cálcular pulse acumulado máximo
                var pulseAccumulatedMax = device.endpoints.byAddress("64").getCurrentState().value || 0;
                if (pulseAccumulated > pulseAccumulatedMax) {
                    pulseAccumulatedMax = pulseAccumulated; // Actualizamos el máximo
                    device.endpoints.byAddress("64").updateGenericSensorStatus(pulseAccumulatedMax, utcDateTime); // Guardamos el máximo en el endpoint 64
                }

                /* // Calcular la relación entre "pulse acumulado drenaje" y "pulse acumulado max"
                var ratioPulseDrenajeMax = 0;
                if (pulseAccumulatedMax !== 0) {
                    ratioPulseDrenajeMax = pulseAccumulatedDrenaje / pulseAccumulatedMax;
                } else {
                    env.log("Error: Pulse acumulado max es 0, no se puede calcular la relación.");
                }
                
                device.endpoints.byAddress("65").updateGenericSensorStatus(ratioPulseDrenajeMax.toFixed(2), utcDateTime);
                
                */

                //Cálculo de humedad calibrada
                // Direcciones específicas de humedades de suelo
                var humedadSueloAddresses = [1, 2, 3, 4, 7, 10, 18, 19, 20, 21, 22, 23, 24, 25];

                // Iteramos por las 14 direcciones de humedad de suelo
                for (var i = 0; i < humedadSueloAddresses.length; i++) {
                    // Direcciones de endpoints
                    var humedadSueloAddress = humedadSueloAddresses[i];
                    var humedadCalibradaAddress = 70 + i; // Endpoints 70 a 83
                    var ccAddress = 84 + i;       // Endpoints 84 a 97
                    var pmpAddress = 98 + i;      // Endpoints 98 a 111

                    // Obtener valores actuales de humedad de suelo, CC y PMP
                    var humedadSueloEndpoint = device.endpoints.byAddress(humedadSueloAddress);
                    var humedadSuelo = humedadSueloEndpoint ? humedadSueloEndpoint.getCurrentState() ?.value : null;

                    var ccEndpoint = device.endpoints.byAddress(ccAddress);
                    var cc = ccEndpoint ? ccEndpoint.getCurrentState() ?.value : null;

                    var pmpEndpoint = device.endpoints.byAddress(pmpAddress);
                    var pmp = pmpEndpoint ? pmpEndpoint.getCurrentState() ?.value : null;

                    // Validar si los valores son válidos
                    if (humedadSuelo === null) {
                        //   env.log("Humedad de suelo en Address " + humedadSueloAddress + " está vacía o es nula. Se omite el cálculo.");
                        continue;
                    }
                    if (cc === null || pmp === null || cc <= pmp) {
                        // env.log("Error: CC o PMP no son válidos para la dirección de humedad de suelo " + humedadSueloAddress);
                        continue;
                    }

                    // Calcular la humedad calibrada
                    var humedadCalibrada = 100 * (humedadSuelo - pmp) / (cc - pmp);

                    // Limitar el valor entre 0 y 100
                    if (humedadCalibrada < 0) humedadCalibrada = 0;
                    if (humedadCalibrada > 100) humedadCalibrada = 100;

                    // Guardar el valor calculado en el endpoint correspondiente
                    var humedadCalibradaEndpoint = device.endpoints.byAddress(humedadCalibradaAddress);
                    if (humedadCalibradaEndpoint) {
                        humedadCalibradaEndpoint.updateGenericSensorStatus(humedadCalibrada.toFixed(2), utcDateTime);
                        // env.log("Sensor en Address " + humedadSueloAddress + ": Humedad calibrada = " + humedadCalibrada.toFixed(2) + "%");
                    } else {
                        // env.log("Error: Endpoint para Humedad Calibrada en Address " + humedadCalibradaAddress + " no configurado.");
                    }
                }


                //Cálculo de media de humedad
                // Direcciones de los endpoints de humedad
                var humedadDirecciones = [1, 2, 3, 4, 7, 10, 18, 19, 20, 21, 22, 23, 24, 25];

                // Array para almacenar los valores de humedad
                var valoresHumedad = [];

                // Iterar sobre los endpoints de humedad
                for (var i = 0; i < humedadDirecciones.length; i++) {
                    var endpoint = device.endpoints.byAddress(humedadDirecciones[i]);

                    // Verificar si el endpoint existe y tiene un valor válido
                    if (endpoint && endpoint.getCurrentState()) {
                        var valor = endpoint.getCurrentState().value;

                        // Si el valor es válido (no es null ni undefined), agregarlo al array
                        if (valor != null && valor !== undefined) {
                            valoresHumedad.push(valor);
                        }
                    }
                }

                // Si hay valores válidos, calcular la media
                if (valoresHumedad.length > 0) {
                    var mediaHumedad = valoresHumedad.reduce(function (suma, valor) {
                        return suma + valor;
                    }, 0) / valoresHumedad.length;

                    // Guardar la media en el endpoint 112
                    var humedadEndpoint = device.endpoints.byAddress(112);
                    if (humedadEndpoint) {
                        var utcDateTime = new Date().toISOString(); // Fecha y hora actual en formato UTC
                        // Usar updateGenericSensorStatus para almacenar la media
                        humedadEndpoint.updateGenericSensorStatus(mediaHumedad.toFixed(2), utcDateTime);
                    }
                } else {
                    // env.log("No se encontraron valores válidos para calcular la media.");
                }

                //Cálculo de la media humedad calibrada
                // Direcciones de los endpoints de humedad calibrada
                var humedadCalibradaDirecciones = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83];

                // Array para almacenar los valores de humedad calibrada
                var valoresHumedadCalibrada = [];

                // Iterar sobre los endpoints de humedad calibrada
                for (var i = 0; i < humedadCalibradaDirecciones.length; i++) {
                    var endpoint = device.endpoints.byAddress(humedadCalibradaDirecciones[i]);

                    // Verificar si el endpoint existe y tiene un valor válido
                    if (endpoint && endpoint.getCurrentState()) {
                        var valor = endpoint.getCurrentState().value;

                        // Si el valor es válido (no es null ni undefined), agregarlo al array
                        if (valor != null && valor !== undefined) {
                            valoresHumedadCalibrada.push(valor);
                        }
                    }
                }

                // Si hay valores válidos, calcular la media de humedad calibrada
                if (valoresHumedadCalibrada.length > 0) {
                    var mediaHumedadCalibrada = valoresHumedadCalibrada.reduce(function (suma, valor) {
                        return suma + valor;
                    }, 0) / valoresHumedadCalibrada.length;

                    // Guardar la media en el endpoint 126
                    var humedadCalibradaEndpoint = device.endpoints.byAddress(126);
                    if (humedadCalibradaEndpoint) {
                        humedadCalibradaEndpoint.updateGenericSensorStatus(mediaHumedadCalibrada.toFixed(2), utcDateTime);
                    }
                } else {
                    //  env.log("No se encontraron valores válidos para calcular la media de humedad calibrada.");
                }

                //Cálcular Presión de Vapor Saturado
                var temperaturaAmb = device.endpoints.byAddress("15").getCurrentState().value;

                var SVP = (610.78 * Math.exp(temperaturaAmb / ((temperaturaAmb + 273.3) * 17.2694))) / 1000;

                device.endpoints.byAddress("144").updatePressureSensorStatus(SVP, utcDateTime);

                //env.log("Temperatura ambiente:", temperaturaAmb);
                //env.log("Presión de vapor saturado (SVP):", SVP);

                //Cálculo Deficit Presión de Vapor
                var humedadRelativa = device.endpoints.byAddress("16").getCurrentState().value;
                //  env.log("Humedad: ", humedadRelativa);
                var DPV = SVP * (1 - (humedadRelativa / 100));
                device.endpoints.byAddress("145").updatePressureSensorStatus(SVP, utcDateTime);
                //  env.log("Deficit Presión de Vapor: ", SVP);


                // Cálculo Radiación Solar Acumulada
                var radiacionSolar = device.endpoints.byAddress("42").getCurrentState().value; // Variable 43
                var tiempoMuestra = device.endpoints.byAddress("56").getCurrentState().value; // Variable 57

                // Verificar si la radiación solar es 0 (reseteo)
                if (radiacionSolar === 0) {
                    var radiacionSolarAcumulada = 0; // Reseteo si la radiación solar es 0
                } else {
                    // Calcular radiación solar acumulada en kWh
                    var radiacionSolarAcumulada = (radiacionSolar * tiempoMuestra * 60) / Math.pow(10, 6); 
                }
          
                device.endpoints.byAddress("146").updateGenericSensorStatus(radiacionSolarAcumulada, utcDateTime);

        
                //env.log("Radiación Solar:", radiacionSolar);
                //env.log("Tiempo Muestra:", tiempoMuestra);
                //env.log("Radiación Solar Acumulada:", radiacionSolarAcumulada);

                //DENDROMETRO

                // Obtener el endpoint del dendrómetro 
                var dendrometroEndpoint = device.endpoints.byAddress(17);


                // Obtener la fecha actual y configurar el inicio y fin del día anterior
                var now = new Date();
                var startOfToday = new Date(now);
                startOfToday.setHours(0, 0, 0, 0); // Inicio del día actual
                var startOfYesterday = new Date(startOfToday.getTime() - (24 * 60 * 60 * 1000)); // Inicio del día anterior
                var endOfYesterday = new Date(startOfToday.getTime() - 1); // Fin del día anterior (23:59:59)

                // Fecha para el día antes del anterior
                var startOfDayBeforeYesterday = new Date(startOfYesterday.getTime() - (24 * 60 * 60 * 1000)); // Inicio del día anterior al anterior
                var endOfDayBeforeYesterday = new Date(startOfYesterday.getTime() - 1); // Fin del día anterior al anterior


                // Obtener los valores máximos y mínimos del dendrómetro para el día anterior
                var maxDendroYesterday = dendrometroEndpoint.getDataPointsMax(startOfYesterday, endOfYesterday);
                env.log(maxDendroYesterday);
                var minDendroYesterday = dendrometroEndpoint.getDataPointsMin(startOfYesterday, endOfYesterday);

                // Obtener los valores del dendrómetro para el día anterior al anterior
                var maxDendroDayBeforeYesterday = dendrometroEndpoint.getDataPointsMax(startOfDayBeforeYesterday, endOfDayBeforeYesterday);

                // Verificar si se obtuvieron datos válidos
                if (maxDendroYesterday === null || maxDendroYesterday === undefined) {
                    maxDendroYesterday = 0; // Valor por defecto si no se encontraron datos
                    env.log('No se encontraron datos máximos para el dendrómetro en el día anterior.');
                }
                if (minDendroYesterday === null || minDendroYesterday === undefined) {
                    minDendroYesterday = 0; // Valor por defecto si no se encontraron datos
                    env.log('No se encontraron datos mínimos para el dendrómetro en el día anterior.');
                }
                if (maxDendroDayBeforeYesterday === null || maxDendroDayBeforeYesterday === undefined) {
                    maxDendroDayBeforeYesterday = 0; // Valor por defecto si no se encontraron datos
                    env.log('No se encontraron datos máximos para el dendrómetro en el día anterior al anterior.');
                }

                env.log('Valor máximo del dendrómetro del día anterior: ', maxDendroYesterday);
                env.log('Valor mínimo del dendrómetro del día anterior: ', minDendroYesterday);
                env.log('Valor mínimo del dendrómetro del día anterior a ayer: ', maxDendroDayBeforeYesterday);

                // Calcular la máxima contracción diaria (MDS) - Diferencia entre el valor máximo y el valor mínimo
                var maxContractionDaily = maxDendroYesterday - minDendroYesterday;
                env.log('Máxima contracción diaria (MDS): ', maxContractionDaily);

                // Calcular la tasa de crecimiento del tronco (TGR) - Diferencia entre el valor máximo del día anterior y el día anterior al anterior
                var TGR = maxDendroYesterday - maxDendroDayBeforeYesterday;
                env.log('Tasa de Crecimiento del Tronco (TGR): ', TGR);

                // Guardar los resultados en los endpoints correspondientes
                device.endpoints.byAddress(66).updateGenericSensorStatus(maxDendroYesterday);  // Valor máximo del dendrómetro día anterior
                device.endpoints.byAddress(67).updateGenericSensorStatus(minDendroYesterday);  // Valor mínimo del dendrómetro día anterior
                device.endpoints.byAddress(68).updateGenericSensorStatus(maxContractionDaily);  // Máxima contracción diaria (MDS)
                device.endpoints.byAddress(69).updateGenericSensorStatus(TGR);  // Tasa de Crecimiento del Tronco (TGR)

                //HORAS DE FRIO
                
                // Endpoints --------------------------------------------------------
                var temperaturaEndpoint = device.endpoints.byAddress(15); // Endpoint de "Temperatura"
                var tiempoEntreMuestrasEndpoint = device.endpoints.byAddress(56); // Endpoint de "Tiempo entre muestras en horas"
                var horasFrioDiaEndpoint = device.endpoints.byAddress(81); // Endpoint de "Horas frío día"

                // Endpoints de fechas configurables por el cliente -----------------
                var fechaInicioEndpoint = device.endpoints.byAddress(158); // Endpoint de "Fecha inicio de campaña"
                var fechaFinEndpoint = device.endpoints.byAddress(159);    // Endpoint de "Fecha fin de campaña"
                // ------------------------------------------------------------------

                // Obtener las fechas configuradas por el cliente
                var startDate = new Date(fechaInicioEndpoint.getCurrentState().value); // Fecha de inicio de la campaña
                var endDate = new Date(fechaFinEndpoint.getCurrentState().value);      // Fecha de fin de la campaña

                // Validar que las fechas sean válidas
                if (isNaN(startDate) || isNaN(endDate)) {
                    env.log('⚠️ Las fechas configuradas en los endpoints no son válidas. Revisa los valores ingresados.');
                    return;
                }

                // Variables para almacenar resultados
                var totalHorasFrio = 0;

                // Obtener puntos de datos de temperatura para el rango especificado
                var temperaturaDataPoints = temperaturaEndpoint.getDataPoints(startDate, endDate);

                // Si hay datos de temperatura
                if (temperaturaDataPoints && temperaturaDataPoints.length > 0) {
                    temperaturaDataPoints.forEach(function (tempPoint) {
                        // Si la temperatura es menor a 7.2°C
                        if (tempPoint.value < 7.2) {
                            // Obtener el tiempo entre muestras en horas
                            var tiempoEntreMuestrasDataPoints = tiempoEntreMuestrasEndpoint.getDataPoints(
                                new Date(tempPoint.timestamp),
                                new Date(tempPoint.timestamp)
                            );

                            // Sumar el tiempo entre muestras si hay datos válidos
                            if (tiempoEntreMuestrasDataPoints && tiempoEntreMuestrasDataPoints.length > 0) {
                                totalHorasFrio += tiempoEntreMuestrasDataPoints[0].value;
                            }
                        }
                    });
                } else {
                    env.log('⚠️ No se encontraron datos de temperatura en el rango especificado.');
                }

                // Guardar el resultado en el endpoint de "Horas frío día"
                horasFrioDiaEndpoint.updateGenericSensorStatus(totalHorasFrio);

                // Log éxito --------------------------------------------------------
                env.log('✅ Total de horas frío calculado para el rango configurado: ', totalHorasFrio);
                // ------------------------------------------------------------------    
            

                // Pulse diario / Pulse Caudal diario / Pulse drenaje diario / % de drenaje diario

                // Obtener los endpoints por address
                var pulseOriginalEndpoint = device.endpoints.byAddress(13);  // Endpoint PULSE Original (Bruto)
                var pulseSumatorioDiarioEndpoint = device.endpoints.byAddress(54);  // Endpoint PULSE Sumatorio Diario
                var pulseOriginalDrenaje = device.endpoints.byAddress(59);  // Endpoint PULSE Original (Bruto)
                var pulseSumatorioDrenaje = device.endpoints.byAddress(61);  // Endpoint PULSE Drenaje Sumatorio Diario
                var tiempoDeRiegoDiario = device.endpoints.byAddress(57);  // Endpoint Tiempo de riego diario
                var pulseCaudalDiario = device.endpoints.byAddress(58);  // Endpoint PULSE Caudal Diario
                var numeroRiegos = device.endpoints.byAddress(63); // Número de eventos
                var endpoint157 = device.endpoints.byAddress(157); // Endpoint acumulador de número de eventos

                // Obtener el momento actual
                var now = new Date();
                var startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0); // Establecer a las 00:00 del día de hoy

                // Cálculo del Pulse Sumatorio Diario usando getDataPointsSum
                var today = new Date();
                today.setHours(0, 0, 0, 0); // Inicio del día actual
                var yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000)); // Inicio del día anterior
                var endOfYesterday = new Date(today.getTime() - 1); // Final del día anterior (23:59:59)

                // Reiniciar el valor del endpoint 157 a 0
                endpoint157.updateGenericSensorStatus(0);
                env.log('Endpoint 157 reiniciado a 0.');

                // Calcular la sumatoria del endpoint 157 durante el día actual
                var sumatoriaEndpoint157 = endpoint157.getDataPointsSum(today, now);
                if (sumatoriaEndpoint157 === null || sumatoriaEndpoint157 === undefined) {
                    sumatoriaEndpoint157 = 0; // Asegurarse de que sea cero si no hay datos
                    env.log('No se encontraron datos para el endpoint 157 en el día de hoy.');
                }
                env.log('Sumatoria del día actual para el endpoint 157: ', sumatoriaEndpoint157);

                // Guardar el cálculo en el endpoint 63
                numeroRiegos.updateGenericSensorStatus(sumatoriaEndpoint157);
                env.log('Cálculo del endpoint 157 guardado en el endpoint 63.');

                // Obtener la suma de valores del Pulse Bruto en el día anterior
                var dailySum = pulseOriginalEndpoint.getDataPointsSum(today, now);
                env.log('Daily Sum: ', dailySum);

                // Obtener la suma de valores del Pulse Drenaje Bruto en el día anterior
                var dailySumDrenaje = pulseOriginalDrenaje.getDataPointsSum(today, now);
                env.log('Daily Sum Drenaje: ', dailySumDrenaje);

                // Comprobar si los valores de dailySum y dailySumDrenaje son válidos
                if (dailySum === null || dailySum === undefined) {
                    dailySum = 0; // Asegurarse de que sea cero si no hay datos
                    env.log('No se encontraron datos de Pulse Bruto para el día de hoy.');
                }

                if (dailySumDrenaje === null || dailySumDrenaje === undefined) {
                    dailySumDrenaje = 0; // Asegurarse de que sea cero si no hay datos
                    env.log('No se encontraron datos de Pulse Drenaje para el día de hoy.');
                }

                // Obtener tiempo de riego diario
                var tiempo = tiempoDeRiegoDiario.getCurrentState().value;
                env.log('Tiempo: ', tiempo);

                // Inicializar tiempoEnHoras
                var tiempoEnHoras = 0;

                // Verificar si el valor de tiempo es un número
                if (typeof tiempo === "number") {
                    var horas = Math.floor(tiempo);  // Parte entera de las horas
                    var minutos = (tiempo - horas) * 60;  // Parte decimal (minutos) y la convertimos a minutos
                    tiempoEnHoras = horas + (minutos / 60);  // Convertir todo a horas
                } else {
                    env.log('Formato de tiempo incorrecto: ', tiempo);
                }

                // Calcular el caudal usando el tiempo en horas
                var caudal = 0;
                if (tiempoEnHoras > 0) {
                    caudal = dailySum / tiempoEnHoras;
                    env.log('Caudal: ', caudal);
                }

                // Calcular la relación de pulso drenaje / pulso diario
                var relacionPulsoDrenaje = 0;
                if (dailySum > 0) {
                    relacionPulsoDrenaje = dailySumDrenaje / dailySum;
                    relacionPulsoDrenaje = parseFloat(relacionPulsoDrenaje.toFixed(2));  // Redondear a 2 decimales
                    env.log('Relación Pulso Drenaje / Pulso Diario: ', relacionPulsoDrenaje);
                }

                // Guardar el valor sumatorio diario en los endpoints
                pulseSumatorioDiarioEndpoint.updateGenericSensorStatus(dailySum);
                pulseSumatorioDrenaje.updateGenericSensorStatus(dailySumDrenaje);
                pulseCaudalDiario.updateGenericSensorStatus(caudal);
                device.endpoints.byAddress(62).updateGenericSensorStatus(relacionPulsoDrenaje);

            // Calcular la sumatoria del endpoint 157
                var sumatoriaEndpoint157 = endpoint157.getDataPointsSum(startOfDay, now);
                if (sumatoriaEndpoint157 === null || sumatoriaEndpoint157 === undefined) {
                    sumatoriaEndpoint157 = 0; // Asegurarse de que sea cero si no hay datos
                    env.log('No se encontraron datos para el endpoint 157 en el día de hoy.');
                }

                // Reiniciar el endpoint 157 a 0
                endpoint157.updateGenericSensorStatus(0);
                numeroRiegos.updateGenericSensorStatus(sumatoriaEndpoint157);

                // Sumatoria de horas de frío por campaña

                // Endpoints --------------------------------------------------------
                var horasFrioDiaEndpoint = device.endpoints.byAddress(147); // Endpoint de "Horas frío día"
                var horasFrioCampanaEndpoint = device.endpoints.byAddress(148); // Endpoint de "Horas frío campaña"

                // Endpoints de fechas configurables por el cliente -----------------
                var fechaInicioEndpoint = device.endpoints.byAddress(158); // Endpoint de "Fecha inicio de campaña"
                var fechaFinEndpoint = device.endpoints.byAddress(159);    // Endpoint de "Fecha fin de campaña"
                // ------------------------------------------------------------------

                // Obtener las fechas configuradas por el cliente
                var startDate = new Date(fechaInicioEndpoint.getCurrentState().value); // Fecha de inicio de la campaña
                var endDate = new Date(fechaFinEndpoint.getCurrentState().value);      // Fecha de fin de la campaña

                // Validar que las fechas sean válidas
                if (isNaN(startDate) || isNaN(endDate)) {
                    env.log('⚠️ Las fechas configuradas en los endpoints no son válidas. Revisa los valores ingresados.');
                    return;
                }

                // Inicializar variable para el sumatorio
                var totalHorasFrioCampana = 0;

                // Obtener puntos de datos de "Horas frío día" en el rango especificado
                var horasFrioDiaDataPoints = horasFrioDiaEndpoint.getDataPoints(startDate, endDate);

                // Sumar los valores de los puntos de datos si existen
                if (horasFrioDiaDataPoints && horasFrioDiaDataPoints.length > 0) {
                    totalHorasFrioCampana = horasFrioDiaDataPoints.reduce((acc, dataPoint) => acc + dataPoint.value, 0);
                } else {
                    env.log('⚠️ No se encontraron datos de "Horas frío día" en el rango de fechas especificado.');
                }

                // Guardar el resultado en el endpoint de "Horas frío campaña"
                horasFrioCampanaEndpoint.updateGenericSensorStatus(totalHorasFrioCampana);

                // Log éxito --------------------------------------------------------
                env.log('✅ El sumatorio de horas frío de campaña calculado es: ', totalHorasFrioCampana);
                // ------------------------------------------------------------------

                //TEMPERATURAS
               
                var endpoint15 = device.endpoints.byAddress(15);  // Endpoint donde se guardan los valores de temperatura

                // Obtener el momento actual y calcular el rango de tiempo para el día anterior
                var now = new Date();
                var startOfYesterday = new Date(now);
                startOfYesterday.setDate(now.getDate() - 1); // Día anterior
                startOfYesterday.setHours(0, 0, 0, 0); // Inicio del día anterior

                var endOfYesterday = new Date(startOfYesterday);
                endOfYesterday.setHours(23, 59, 59, 999); // Fin del día anterior

                var max = endpoint15.getDataPointsMax(startOfYesterday, endOfYesterday);
                var min = endpoint15.getDataPointsMin(startOfYesterday, endOfYesterday);
                var media = endpoint15.getDataPointsAvg(startOfYesterday, endOfYesterday);

                // Actualizar los valores en los endpoints correspondientes
                var endpointMax = device.endpoints.byAddress(141);  // Endpoint para la temperatura máxima
                var endpointMin = device.endpoints.byAddress(142);  // Endpoint para la temperatura mínima
                var endpointAvg = device.endpoints.byAddress(143);  // Endpoint para la temperatura media

                // Guardar los cálculos en los endpoints
                endpointMax.updateTemperatureSensorStatus(max.toFixed(2));
                endpointMin.updateTemperatureSensorStatus(min.toFixed(2));
                endpointAvg.updateTemperatureSensorStatus(media.toFixed(2));

                //Tiempo de riego diario
                // 📝 Variables importantes para el Script 📝
                var startDateString = '2024-01-01'; // Aquí, entre comillas, pon la fecha del inicio de la campaña 🗓️
                var endDateString = '2024-12-31';   // Aquí, entre comillas, pon la fecha del final de la campaña 🗓️

                // Conversión de variables de fecha
                var startDate = new Date(startDateString); // Fecha de inicio
                var endDate = new Date(endDateString);     // Fecha de fin

                // Endpoint para "Horas frío día"
                var horasFrioDiaEndpoint = device.endpoints.byAddress(147); // Endpoint para valores diarios de horas frío

                // Endpoint para "Horas frío campaña"
                var horasFrioCampanaEndpoint = device.endpoints.byAddress(82); // Endpoint para acumular el total de horas frío

                // Inicializar variable para el sumatorio de horas frío, empezando por 0
                var totalHorasFrio = 0;

                // Obtener los puntos de datos de "horas frío día" en el rango de fechas
                var dataPoints = horasFrioDiaEndpoint.getDataPointsLT(startDate, endDate);

                // Verificar si hay puntos de datos disponibles
                if (dataPoints && dataPoints.length > 0) {
                    // Sumar los valores de los puntos de datos
                    dataPoints.forEach(function(dataPoint) {
                        totalHorasFrio += dataPoint.value; // Acumular el valor de cada punto de datos
                    });
                    env.log('✅ Total de horas frío calculado: ' + totalHorasFrio);
                } else {
                    // Registrar en los logs si no hay datos disponibles
                    env.log('⚠️ No se encontraron datos de "horas frío día" en el rango de fechas especificado.');
                    totalHorasFrio = 0; // Valor por defecto si no hay datos
                }

                // Guardar el resultado en el endpoint de "Horas frío campaña"
                horasFrioCampanaEndpoint.updateGenericSensorStatus(totalHorasFrio);

                // Registrar en los logs el resultado final
                env.log('✅ Sumatorio de horas frío campaña guardado en el endpoint 82: ' + totalHorasFrio);

                //Humedad relativa media diaria

                var endpoint16 = device.endpoints.byAddress(16);  // Endpoint donde se guardan los valores de humedad
                var endpoint45 = device.endpoints.byAddress(45);  // Endpoint donde se guardan los valores de velocidad del viento

                // Obtener el momento actual y calcular el rango de tiempo para el día anterior
                var now = new Date();
                var startOfYesterday = new Date(now);
                startOfYesterday.setDate(now.getDate() - 1); // Día anterior
                startOfYesterday.setHours(0, 0, 0, 0); // Inicio del día anterior
                var endOfYesterday = new Date(startOfYesterday);
                endOfYesterday.setHours(23, 59, 59, 999); // Fin del día anterior

                var mediah = endpoint16.getDataPointsAvg(startOfYesterday, endOfYesterday);
                var mediav = endpoint45.getDataPointsAvg(startOfYesterday, endOfYesterday);

                // Redondear a 2 decimales si hay datos
                if (mediah && mediah.length > 0) {
                    mediah = parseFloat(mediah.toFixed(2));
                }
                if (mediav && mediav.length > 0) {
                    mediav = parseFloat(mediav.toFixed(2));
                }

                env.log('Humedad relativa media diaria: ', mediah);
                env.log('Velocidad del viento media diaria: ', mediav);

                // Verificar si hay datos antes de guardar
                if (mediah && mediah.length > 0) {
                    var endpointAvgh = device.endpoints.byAddress(160);  // Endpoint para la humedad media
                    endpointAvgh.updateHumiditySensorStatus(mediah.toFixed(2)); // Guardar si hay datos válidos
                } else {
                    env.log('⚠️ No se encontraron datos de "Humedad relativa media diaria" en el rango de fechas especificado.');
                }

                if (mediav && mediav.length > 0) {
                    var endpointAvgv = device.endpoints.byAddress(161);  // Endpoint para la velocidad media
                    endpointAvgv.updateGenericSensorStatus(mediav.toFixed(2)); // Guardar si hay datos válidos
                } else {
                    env.log('⚠️ No se encontraron datos de "Velocidad del viento media diaria" en el rango de fechas especificado.');
                }

                //Cálcular Presión de vapor de saturación diario
                var temperaturaMed = device.endpoints.byAddress("143").getCurrentState().value;

                var DSVP = (0.6108 * Math.exp(17.27*temperaturaMed / ((temperaturaMed + 237.3))));

                device.endpoints.byAddress("162").updatePressureSensorStatus(DSVP.toFixed(2), utcDateTime);
                
                //Cálcular Presión de vapor de actual diario
                var humrelmeddiaria = device.endpoints.byAddress("160").getCurrentState().value;

                var ADVP = (humrelmeddiaria / 100 * DSVP);

                device.endpoints.byAddress("163").updatePressureSensorStatus(ADVP.toFixed(2), utcDateTime);

                //Cálcular Pendiente de la curva de presión de vapor

                var Pend = (4098 * DSVP / ((temperaturaMed + 237.3)*(temperaturaMed + 237.3)));

                device.endpoints.byAddress("164").updateGenericSensorStatus(Pend.toFixed(2), utcDateTime);

                //Cálcular Presion atmosferica calculada diaria

                var Latitud = device.endpoints.byAddress("168").getCurrentState().value;
                var Altitud = device.endpoints.byAddress("169").getCurrentState().value;

                var Patm = (101.325 * (1 - (0.0065 * Altitud) / 273,15) ^ (5,255))

                device.endpoints.byAddress("165").updatePressureSensorStatus(Patm.toFixed(2), utcDateTime);

                //Cálcular Constante psicrométrica (γ)

                var γ = (Patm * 1.013) / (0.622 * 2.45);

                device.endpoints.byAddress("166").updateGenericSensorStatus(γ.toFixed(2), utcDateTime);

                //Cálcular Evapotranspiración de referencia (ET₀)

                var ETo = (0.408 * Pend * mediav + γ * (900 / (temperaturaMed + 273)) * Latitud * (DSVP - ADVP) / (Pend + γ * (1 + 0.34 * Latitud)));

                device.endpoints.byAddress("167").updateGenericSensorStatus(ETo.toFixed(2), utcDateTime);
                /**/
            }
            else {
                env.log("El array 'sensor' no es válido o está vacío.");
            }
        });
    } else {
        env.log("El payload no es un array válido o está vacío.");
    }
}