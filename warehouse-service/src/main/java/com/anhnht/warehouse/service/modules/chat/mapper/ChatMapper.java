package com.anhnht.warehouse.service.modules.chat.mapper;

import com.anhnht.warehouse.service.common.mapper.CommonMapperConfig;
import com.anhnht.warehouse.service.modules.chat.dto.response.ChatRoomResponse;
import com.anhnht.warehouse.service.modules.chat.dto.response.ChatUserResponse;
import com.anhnht.warehouse.service.modules.chat.dto.response.MessageResponse;
import com.anhnht.warehouse.service.modules.chat.entity.ChatRoom;
import com.anhnht.warehouse.service.modules.chat.entity.Message;
import com.anhnht.warehouse.service.modules.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CommonMapperConfig.class)
public interface ChatMapper {

    @Mapping(source = "type.typeName", target = "typeName")
    ChatRoomResponse toChatRoomResponse(ChatRoom chatRoom);

    @Mapping(source = "sender.userId",   target = "senderId")
    @Mapping(source = "sender.fullName", target = "senderName")
    MessageResponse toMessageResponse(Message message);

    ChatUserResponse toChatUserResponse(User user);
}
