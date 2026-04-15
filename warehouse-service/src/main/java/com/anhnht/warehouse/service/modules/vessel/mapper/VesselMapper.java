package com.anhnht.warehouse.service.modules.vessel.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.vessel.dto.response.*;
import com.anhnht.warehouse.service.modules.vessel.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(config = CommonMapperConfig.class)
public interface VesselMapper {

    VesselResponse toVesselResponse(Vessel vessel);

    @Mapping(source = "vessel.vesselId",     target = "vesselId")
    @Mapping(source = "vessel.vesselName",   target = "vesselName")
    @Mapping(source = "vessel.shippingLine", target = "shippingLine")
    VoyageResponse toVoyageResponse(Voyage voyage);

    @Mapping(source = "voyage.voyageId",        target = "voyageId")
    @Mapping(source = "voyage.voyageNo",         target = "voyageNo")
    @Mapping(source = "voyage.vessel.vesselName",target = "vesselName")
    ManifestResponse toManifestResponse(Manifest manifest);

    List<VesselResponse>   toVesselResponses(List<Vessel> list);
    List<VoyageResponse>   toVoyageResponses(List<Voyage> list);
    List<ManifestResponse> toManifestResponses(List<Manifest> list);
}
